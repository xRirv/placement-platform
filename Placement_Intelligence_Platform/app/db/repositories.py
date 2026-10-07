from __future__ import annotations

import logging
from typing import Any

from app.ai_pipeline.stages.extract import EntityType
from app.ai_pipeline.stages.normalize import normalize_company, normalize_question, normalize_role
from app.ai_pipeline.stages.persist import EntityRef
from app.ai_pipeline.stages.resolve import ExistingEntity, EntityRepository
from app.db.client import supabase

logger = logging.getLogger("db_repository")

class DatabaseError(Exception):
    """Raised on repository/database operation failures."""

class SupabaseRepository(EntityRepository):
    """Concrete repository satisfying resolve.py's EntityRepository protocol."""
    def find_exact(self, entity_type: EntityType, normalized_value: str) -> ExistingEntity | None:
        table_map = {
            EntityType.COMPANY: "companies",
            EntityType.ROLE: "roles",
            EntityType.ROUND: "rounds",
            EntityType.QUESTION: "question_canonical"
        }
        
        # Map each EntityType to its specific database column
        col_map = {
            EntityType.COMPANY: "normalized_name",
            EntityType.ROLE: "normalized_name",
            EntityType.ROUND: "round_name",
            EntityType.QUESTION: "normalized_text"
        }

        target_table = table_map.get(entity_type)
        col_name = col_map.get(entity_type, "name")
        
        if not target_table:
            return None

        try:
            res = supabase.table(target_table).select("*").execute()
            rows = res.data or []
            row = next(
                (candidate for candidate in rows
                 if str(candidate.get(col_name) or "").casefold().strip() == normalized_value.casefold().strip()),
                None,
            )
            if row is None:
                return None

            canonical_val = row.get("canonical_text") or row.get("round_name") or row.get("name") or normalized_value
            
            return ExistingEntity(
                entity_id=str(row["id"]),
                entity_type=entity_type,
                canonical_name=canonical_val,
                normalized_value=normalized_value,
                tokens=normalized_value.split(),
                category=row.get("category"),
                topic=row.get("topic"),
                subtopic=row.get("subtopic"),
                difficulty=row.get("difficulty")
            )
        except Exception as e:
            logger.error("Error in find_exact (%s: %s): %s", entity_type, normalized_value, e)
            raise DatabaseError(e) from e
    def find_similar(
        self, entity_type: EntityType, normalized_value: str, tokens: list[str], limit: int
    ) -> list[ExistingEntity]:
        """Bounded top-K candidate generation for fuzzy matching in resolve.py."""
        table_map = {
            EntityType.COMPANY: "companies",
            EntityType.ROLE: "roles",
            EntityType.ROUND: "rounds",
            EntityType.QUESTION: "question_canonical"
        }
        target_table = table_map.get(entity_type)
        if not target_table:
            return []

        try:
            res = supabase.table(target_table).select("*").limit(limit).execute()
            candidates = []

            for row in (res.data or []):
                canonical_val = row.get("canonical_text") or (
                    row.get("round_name") if entity_type is EntityType.ROUND else row.get("name")
                ) or ""
                candidates.append(
                    ExistingEntity(
                        entity_id=str(row["id"]),
                        entity_type=entity_type,
                        canonical_name=canonical_val,
                        normalized_value=canonical_val.lower(),
                        tokens=canonical_val.lower().split(),
                        category=row.get("category"),
                        topic=row.get("topic"),
                        subtopic=row.get("subtopic"),
                        difficulty=row.get("difficulty")
                    )
                )
            return candidates
        except Exception as e:
            logger.error("Error in find_similar (%s): %s", entity_type, e)
            raise DatabaseError(e) from e

    def fetch_raw_experience(self, experience_id: str) -> dict[str, Any]:
        """Fetches raw experience record from Team A's experiences table."""
        try:
            res = supabase.table("experiences").select("*").eq("experience_id", experience_id).execute()
            if not res.data:
                raise DatabaseError(f"No experience found with experience_id: {experience_id}")
            return res.data[0]
        except Exception as e:
            logger.error("Error fetching raw experience %s: %s", experience_id, e)
            raise DatabaseError(e) from e

    def apply_payload(self, payload: Any) -> dict[str, Any]:
        """Applies PersistencePayload idempotently without modifying raw experiences."""
        try:
            entity_groups = (
                ("companies_to_create", "companies", "normalized_name"),
                ("roles_to_create", "roles", "normalized_name"),
                ("rounds_to_create", "rounds", "round_name"),
                ("questions_to_create", "question_canonical", "normalized_text"),
            )
            for attribute, table, conflict_column in entity_groups:
                for entity in getattr(payload, attribute, []):
                    if table == "rounds":
                        round_link = next(
                            (link for link in payload.experience_round_links if link.round_ref.temp_id == entity.temp_id),
                            None,
                        )
                        if round_link is None:
                            raise DatabaseError(f"Missing round link for {entity.temp_id}")
                        ordinal = round_link.ordinal
                        if ordinal is None:
                            ordinal = next(
                                index
                                for index, link in enumerate(payload.experience_round_links, start=1)
                                if link.round_ref.temp_id == entity.temp_id
                            )
                        row = {
                            "experience_id": payload.experience_id,
                            "round_number": ordinal,
                            "round_name": entity.canonical_name,
                            "order_index": ordinal,
                        }
                        existing_round = (
                            supabase.table(table).select("id")
                            .eq("experience_id", payload.experience_id)
                            .eq("round_number", ordinal)
                            .limit(1).execute().data
                        )
                        if existing_round:
                            supabase.table(table).update(row).eq("id", existing_round[0]["id"]).execute()
                        else:
                            supabase.table(table).insert(row).execute()
                        continue
                    row = {"name": entity.canonical_name} if table != "question_canonical" else {
                        "canonical_text": entity.canonical_name,
                    }
                    if table == "companies":
                        row["normalized_name"] = normalize_company(entity.normalized_value)
                    elif table == "roles":
                        row["normalized_name"] = normalize_role(entity.normalized_value)
                    if table == "question_canonical":
                        row.update({
                            "normalized_text": normalize_question(entity.normalized_value),
                            "category": entity.category,
                            "topic": entity.topic,
                            "subtopic": entity.subtopic,
                            "difficulty": entity.difficulty,
                        })
                    supabase.table(table).upsert(row, on_conflict=conflict_column).execute()

            for entity_group in (
                getattr(payload, "companies_to_update", []),
                getattr(payload, "roles_to_update", []),
                getattr(payload, "rounds_to_update", []),
                getattr(payload, "questions_to_update", []),
            ):
                for update in entity_group:
                    changes = {}
                    if update.set_difficulty is not None:
                        changes["difficulty"] = update.set_difficulty
                    if changes:
                        table = "question_canonical" if update.entity_type == EntityType.QUESTION else {
                            EntityType.COMPANY: "companies",
                            EntityType.ROLE: "roles",
                            EntityType.ROUND: "rounds",
                        }[update.entity_type]
                        supabase.table(table).update(changes).eq("id", update.entity_id).execute()

            def entity_id(ref, entity_type):
                if ref is None:
                    return None
                if ref.existing_id:
                    return ref.existing_id
                for attribute, table, identity_column in (
                    ("companies_to_create", "companies", "normalized_name"),
                    ("roles_to_create", "roles", "normalized_name"),
                    ("questions_to_create", "question_canonical", "normalized_text"),
                ):
                    for entity in getattr(payload, attribute, []):
                        if entity.temp_id == ref.temp_id:
                            value = normalize_question(entity.normalized_value) if entity_type is EntityType.QUESTION else (
                                normalize_role(entity.normalized_value) if entity_type is EntityType.ROLE
                                else normalize_company(entity.normalized_value)
                            )
                            result = supabase.table(table).select("id").eq(identity_column, value).limit(1).execute().data
                            if result:
                                return result[0]["id"]
                for link in payload.experience_round_links:
                    if link.round_ref.temp_id == ref.temp_id:
                        ordinal = link.ordinal
                        if ordinal is None:
                            ordinal = next(
                                index
                                for index, candidate in enumerate(payload.experience_round_links, start=1)
                                if candidate.round_ref.temp_id == ref.temp_id
                            )
                        result = (
                            supabase.table("rounds").select("id")
                            .eq("experience_id", payload.experience_id)
                            .eq("round_number", ordinal).limit(1).execute().data
                        )
                        if result:
                            return result[0]["id"]
                raise DatabaseError(f"Could not resolve persistence reference {ref}")

            for link in payload.experience_company_links:
                supabase.table("experience_companies").upsert(
                    {"experience_id": payload.experience_id, "company_id": entity_id(link.ref, EntityType.COMPANY), "is_primary": link.is_primary},
                    on_conflict="experience_id,company_id",
                ).execute()
            for link in payload.experience_role_links:
                supabase.table("experience_roles").upsert(
                    {"experience_id": payload.experience_id, "role_id": entity_id(link.ref, EntityType.ROLE), "is_primary": link.is_primary},
                    on_conflict="experience_id,role_id",
                ).execute()
            for link in payload.experience_question_links:
                supabase.table("experience_questions").upsert(
                    {
                        "experience_id": payload.experience_id,
                        "question_id": entity_id(link.question_ref, EntityType.QUESTION),
                        "round_id": entity_id(link.round_ref, EntityType.ROUND),
                        "question_order": link.order,
                        "asked_text": link.asked_text,
                    },
                    on_conflict="experience_id,question_order",
                ).execute()
            topic_ids = {}
            for topic in getattr(payload, "topics_to_upsert", []):
                result = supabase.table("topics").upsert(
                    {"category": topic.category, "topic": topic.topic or "", "subtopic": ""},
                    on_conflict="category,topic,subtopic",
                ).execute().data
                if result:
                    topic_ids[(topic.category, topic.topic, None)] = result[0]["id"]
                else:
                    result = supabase.table("topics").select("id").eq("category", topic.category).eq("topic", topic.topic or "").limit(1).execute().data
                    if result:
                        topic_ids[(topic.category, topic.topic, None)] = result[0]["id"]
            for link in payload.question_topic_links:
                question_id = entity_id(link.question_ref, EntityType.QUESTION)
                topic_id = topic_ids.get((link.category, link.topic, link.subtopic)) or topic_ids.get((link.category, link.topic, None))
                if topic_id:
                    supabase.table("question_topics").upsert(
                        {"question_id": question_id, "topic_id": topic_id, "confidence": link.confidence, "source": link.source},
                        on_conflict="question_id,topic_id",
                    ).execute()
            for attribute, entity_type in (
                ("companies_to_create", EntityType.COMPANY),
                ("roles_to_create", EntityType.ROLE),
                ("rounds_to_create", EntityType.ROUND),
                ("questions_to_create", EntityType.QUESTION),
            ):
                for entity in getattr(payload, attribute, []):
                    entity_id_value = entity_id(EntityRef(temp_id=entity.temp_id), entity_type)
                    for alias in entity.aliases:
                        supabase.table("entity_aliases").upsert(
                            {
                                "entity_type": entity_type.value,
                                "entity_id": entity_id_value,
                                "alias_text": alias.original_value,
                                "normalized_value": alias.normalized_value,
                            },
                            on_conflict="entity_type,normalized_value",
                        ).execute()
                    provenance = entity.provenance
                    supabase.table("provenance").upsert(
                        {
                            "experience_id": payload.experience_id,
                            "entity_type": entity_type.value,
                            "entity_id": entity_id_value,
                            "segment_indices": provenance.segment_indices,
                            "source_texts": provenance.source_texts,
                            "extraction_confidence": provenance.extraction_confidence,
                            "resolution_method": provenance.resolution_method,
                            "resolution_score": provenance.resolution_score,
                        },
                        on_conflict="experience_id,entity_type,entity_id,resolution_method",
                    ).execute()

            logger.info(f"Successfully applied payload for experience_id={payload.experience_id}")
            return {"status": "SUCCESS", "experience_id": payload.experience_id}
        except Exception as e:
            logger.error("Failed to apply payload: %s", e)
            raise DatabaseError(f"Persistence error: {e}") from e

    def upsert_raw_experience(self, row: dict[str, Any]):
        """Creates or replaces a raw experience row (keyed by experience_id) and queues it."""
        payload = {key: value for key, value in row.items() if value is not None}
        payload.update({"status": "QUEUED", "stage": "INGESTION", "error": None})
        try:
            supabase.table("experiences").upsert(payload, on_conflict="experience_id").execute()
        except Exception as exc:
            logger.error("Failed to upsert experience experience_id=%s: %s", row.get("experience_id"), exc)
            raise DatabaseError(f"Upsert failed for {row.get('experience_id')}: {exc}") from exc

    def update_raw_status(self, experience_id: str, status: str, stage: str, error: str | None = None):
        """Updates status metadata on Team A's raw experiences table."""
        payload = {"status": status, "stage": stage, "error": error}
        if status == "COMPLETED":
            from datetime import datetime, timezone
            payload["completed_at"] = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("experiences").update(payload).eq("experience_id", experience_id).execute()
        except Exception as exc:
            logger.error("Failed to update experience status experience_id=%s: %s", experience_id, exc)
            raise DatabaseError(f"Status update failed for {experience_id}: {exc}") from exc