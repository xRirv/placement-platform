"""Stage 6 - persist: turn the classified result into a database-ready PersistencePayload.

No database access. The payload tells the future repository exactly what to
create, update and link. Duplicate canonical entities are prevented here in two ways:
  * MATCH_EXISTING entities are referenced by their real id, never re-created.
  * New entities get a DETERMINISTIC temp_id (uuid5 of type + normalized value), so
    the same entity mentioned twice yields one create, and re-running the same
    experience yields the same payload (idempotent).
"""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field

from .. import PIPELINE_VERSION, log_event, stage_guard
from .classify import ClassifiedData, ClassifiedQuestion, Difficulty
from .extract import EntityType
from .resolve import Alias, Decision, ResolvedEntity

# ============================================================
# 1. INPUT / OUTPUT MODELS
# ============================================================

_NAMESPACE = uuid.UUID("6f1c2d3e-0000-4000-8000-a1b2c3d4e5f6")  # fixed so temp ids are stable across runs
# New entities below their type's extraction confidence are created but flagged for review.
# Companies/roles are stricter because a weak preposition match ("to Bangalore") can be junk;
# a bare bullet-list question legitimately scores 0.5.
MIN_CREATE_CONFIDENCE = {EntityType.COMPANY: 0.6, EntityType.ROLE: 0.6, EntityType.ROUND: 0.5, EntityType.QUESTION: 0.5}


class EntityRef(BaseModel):
    """Points at a canonical entity: either one that exists, or one created in this same payload."""

    existing_id: Optional[str] = None
    temp_id: Optional[str] = None


class Provenance(BaseModel):
    segment_indices: list[int]
    source_texts: list[str]
    extraction_confidence: float
    resolution_method: str
    resolution_score: float


class EntityCreate(BaseModel):
    temp_id: str
    entity_type: EntityType
    canonical_name: str
    normalized_value: str
    tokens: list[str]
    aliases: list[Alias] = Field(default_factory=list)
    needs_review: bool = False
    review_reason: Optional[str] = None
    suspected_match_id: Optional[str] = None
    category: Optional[str] = None  # questions only
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    difficulty: Optional[str] = None
    provenance: Provenance


class EntityUpdate(BaseModel):
    entity_id: str
    entity_type: EntityType
    add_aliases: list[Alias] = Field(default_factory=list)
    set_difficulty: Optional[str] = None  # only sent when the stored difficulty is unknown


class TopicUpsert(BaseModel):
    category: str
    topic: Optional[str] = None


class ExperienceEntityLink(BaseModel):
    experience_id: str
    ref: EntityRef
    is_primary: bool = False
    provenance: Provenance


class ExperienceRoundLink(BaseModel):
    experience_id: str
    round_ref: EntityRef  # canonical round type
    ordinal: Optional[int] = None  # (round_ref, ordinal) identifies the round within this experience
    is_final: bool = False
    provenance: Provenance


class ExperienceQuestionLink(BaseModel):
    experience_id: str
    question_ref: EntityRef
    order: int
    asked_text: str  # the question as written in this experience
    round_ref: Optional[EntityRef] = None
    round_ordinal: Optional[int] = None
    provenance: Provenance


class QuestionTopicLink(BaseModel):
    question_ref: EntityRef
    category: str
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    confidence: float
    source: str


class ReviewItem(BaseModel):
    ref: EntityRef
    entity_type: EntityType
    reason: str
    suspected_match_id: Optional[str] = None


class ExtractionMetadata(BaseModel):
    pipeline_version: str
    counts: dict[str, int]
    warnings: list[str] = Field(default_factory=list)


class PersistencePayload(BaseModel):
    experience_id: str
    companies_to_create: list[EntityCreate] = Field(default_factory=list)
    companies_to_update: list[EntityUpdate] = Field(default_factory=list)
    roles_to_create: list[EntityCreate] = Field(default_factory=list)
    roles_to_update: list[EntityUpdate] = Field(default_factory=list)
    rounds_to_create: list[EntityCreate] = Field(default_factory=list)
    rounds_to_update: list[EntityUpdate] = Field(default_factory=list)
    questions_to_create: list[EntityCreate] = Field(default_factory=list)
    questions_to_update: list[EntityUpdate] = Field(default_factory=list)
    topics_to_upsert: list[TopicUpsert] = Field(default_factory=list)
    experience_company_links: list[ExperienceEntityLink] = Field(default_factory=list)
    experience_role_links: list[ExperienceEntityLink] = Field(default_factory=list)
    experience_round_links: list[ExperienceRoundLink] = Field(default_factory=list)
    experience_question_links: list[ExperienceQuestionLink] = Field(default_factory=list)
    question_topic_links: list[QuestionTopicLink] = Field(default_factory=list)
    review_items: list[ReviewItem] = Field(default_factory=list)
    metadata: ExtractionMetadata


# ============================================================
# 2. CORE PROCESSING
# ============================================================


class _Builder:
    """Accumulates creates/updates keyed by identity so duplicates collapse."""

    def __init__(self, experience_id: str) -> None:
        self.experience_id = experience_id
        self.creates: dict[tuple[EntityType, str], EntityCreate] = {}
        self.updates: dict[tuple[EntityType, str], EntityUpdate] = {}
        self.review: list[ReviewItem] = []
        self.new_count = 0
        self.matched_count = 0

    def ref_for(self, item: ResolvedEntity, question: Optional[ClassifiedQuestion] = None) -> EntityRef:
        if item.decision is Decision.MATCH_EXISTING and item.matched is not None:
            self.matched_count += 1
            self._record_update(item, question)
            return EntityRef(existing_id=item.matched.entity_id)
        return self._record_create(item, question)

    def _record_update(self, item: ResolvedEntity, question: Optional[ClassifiedQuestion]) -> None:
        existing = item.matched
        assert existing is not None
        aliases = [a for a in item.variants if a.normalized_value != existing.normalized_value]
        difficulty = None
        stored_unknown = not existing.difficulty or existing.difficulty == Difficulty.UNKNOWN.value
        if question is not None and stored_unknown:
            new = question.classification.difficulty
            difficulty = new.value if new is not Difficulty.UNKNOWN else None
        if not aliases and difficulty is None:
            return
        key = (item.entity.entity_type, existing.entity_id)
        update = self.updates.setdefault(key, EntityUpdate(entity_id=existing.entity_id, entity_type=item.entity.entity_type))
        known = {a.normalized_value for a in update.add_aliases}
        update.add_aliases.extend(a for a in aliases if a.normalized_value not in known)
        update.set_difficulty = update.set_difficulty or difficulty

    def _record_create(self, item: ResolvedEntity, question: Optional[ClassifiedQuestion]) -> EntityRef:
        ent = item.entity
        temp_id = str(uuid.uuid5(_NAMESPACE, f"{ent.entity_type.value}:{ent.normalized_value}"))
        key = (ent.entity_type, temp_id)
        canonical = _canonical_name(item)
        aliases = [a for a in item.variants if a.normalized_value != ent.normalized_value]
        if key in self.creates:
            known = {a.normalized_value for a in self.creates[key].aliases}
            self.creates[key].aliases.extend(a for a in aliases if a.normalized_value not in known)
            return EntityRef(temp_id=temp_id)

        reason = None
        if item.decision is Decision.NEED_REVIEW:
            reason = f"ambiguous match: {item.reason}"
        elif ent.confidence < MIN_CREATE_CONFIDENCE[ent.entity_type]:
            reason = f"low extraction confidence ({ent.confidence:.2f})"
        cls = question.classification if question else None
        create = EntityCreate(
            temp_id=temp_id, entity_type=ent.entity_type, canonical_name=canonical, normalized_value=ent.normalized_value,
            tokens=ent.tokens, aliases=aliases, needs_review=reason is not None, review_reason=reason,
            suspected_match_id=item.runners_up[0].entity_id if item.decision is Decision.NEED_REVIEW and item.runners_up else None,
            category=cls.category.value if cls else None, topic=cls.topic if cls else None,
            subtopic=cls.subtopic if cls else None,
            difficulty=cls.difficulty.value if cls and cls.difficulty is not Difficulty.UNKNOWN else None,
            provenance=_provenance(item),
        )
        self.creates[key] = create
        self.new_count += 1
        if reason:
            self.review.append(ReviewItem(ref=EntityRef(temp_id=temp_id), entity_type=ent.entity_type, reason=reason,
                                          suspected_match_id=create.suspected_match_id))
            log_event("entity_needs_review", experience_id=self.experience_id, type=ent.entity_type.value,
                      value=ent.normalized_value, reason=reason)
        return EntityRef(temp_id=temp_id)


def _pick_primary(items: list[ResolvedEntity]) -> Optional[ResolvedEntity]:
    """Caller-supplied hint wins; otherwise the most confident, most-mentioned entity."""
    if not items:
        return None
    return max(items, key=lambda i: (i.entity.extraction_method == "hint", i.entity.confidence, i.mentions))


# ============================================================
# 3. HELPERS
# ============================================================


def _canonical_name(item: ResolvedEntity) -> str:
    """Display name for a NEW canonical entity. Rounds use their type; company/role names typed
    in all-caps or all-lowercase are title-cased (short all-caps like 'TCS' are kept)."""
    ent = item.entity
    if ent.entity_type is EntityType.ROUND:
        return ent.round_kind or ent.original_value
    name = ent.original_value.strip()
    if ent.entity_type in (EntityType.COMPANY, EntityType.ROLE) and (name.islower() or (name.isupper() and len(name) > 4)):
        return name.title()
    return name


def _provenance(item: ResolvedEntity) -> Provenance:
    return Provenance(segment_indices=item.segment_indices, source_texts=[item.entity.source_text],
                      extraction_confidence=item.entity.confidence, resolution_method=item.method,
                      resolution_score=item.score)


def _assert_refs_resolvable(payload: PersistencePayload) -> None:
    """Every temp_id used by a link must be created in this payload; catches assembly bugs early."""
    created = {c.temp_id for group in (payload.companies_to_create, payload.roles_to_create,
                                       payload.rounds_to_create, payload.questions_to_create) for c in group}
    refs = [l.ref for l in payload.experience_company_links + payload.experience_role_links]
    refs += [l.round_ref for l in payload.experience_round_links]
    refs += [l.question_ref for l in payload.experience_question_links]
    refs += [l.round_ref for l in payload.experience_question_links if l.round_ref]
    refs += [l.question_ref for l in payload.question_topic_links]
    for ref in refs:
        if (ref.existing_id is None) == (ref.temp_id is None):
            raise ValueError(f"EntityRef must have exactly one of existing_id/temp_id: {ref}")
        if ref.temp_id and ref.temp_id not in created:
            raise ValueError(f"dangling temp_id {ref.temp_id}: linked but never created")


# ============================================================
# 4. PUBLIC STAGE FUNCTION
# ============================================================


@stage_guard("persist", "build_persistence_payload")
def build_persistence_payload(data: ClassifiedData) -> PersistencePayload:
    """Assemble creates, updates, links and provenance for the repository to apply in one transaction."""
    b = _Builder(data.experience_id)
    exp = data.experience_id

    primary_company = _pick_primary(data.companies)
    company_links = [ExperienceEntityLink(experience_id=exp, ref=b.ref_for(c), is_primary=c is primary_company,
                                          provenance=_provenance(c)) for c in data.companies]
    primary_role = _pick_primary(data.roles)
    role_links = [ExperienceEntityLink(experience_id=exp, ref=b.ref_for(r), is_primary=r is primary_role,
                                       provenance=_provenance(r)) for r in data.roles]

    round_refs: dict[str, tuple[EntityRef, Optional[int]]] = {}
    round_links = []
    for rnd in data.rounds:
        ref = b.ref_for(rnd)
        round_refs[rnd.key] = (ref, rnd.entity.round_ordinal)
        round_links.append(ExperienceRoundLink(experience_id=exp, round_ref=ref, ordinal=rnd.entity.round_ordinal,
                                               is_final=rnd.entity.round_is_final, provenance=_provenance(rnd)))

    question_links, topic_links, topics = [], [], {}
    for order, cq in enumerate(sorted(data.questions, key=lambda q: min(q.resolved.segment_indices, default=0)), start=1):
        item, cls = cq.resolved, cq.classification
        ref = b.ref_for(item, cq)
        round_ref, ordinal = round_refs.get(item.round_keys[0], (None, None)) if item.round_keys else (None, None)
        question_links.append(ExperienceQuestionLink(experience_id=exp, question_ref=ref, order=order,
                                                     asked_text=item.entity.original_value, round_ref=round_ref,
                                                     round_ordinal=ordinal, provenance=_provenance(item)))
        if cls.source != "existing":  # a matched question already has its topic links stored
            topics[(cls.category.value, cls.topic)] = TopicUpsert(category=cls.category.value, topic=cls.topic)
            topic_links.append(QuestionTopicLink(question_ref=ref, category=cls.category.value, topic=cls.topic,
                                                 subtopic=cls.subtopic, confidence=cls.category_confidence, source=cls.source))

    def by_type(t: EntityType, store: dict) -> list:
        return [v for (kind, _), v in store.items() if kind is t]

    payload = PersistencePayload(
        experience_id=exp,
        companies_to_create=by_type(EntityType.COMPANY, b.creates), companies_to_update=by_type(EntityType.COMPANY, b.updates),
        roles_to_create=by_type(EntityType.ROLE, b.creates), roles_to_update=by_type(EntityType.ROLE, b.updates),
        rounds_to_create=by_type(EntityType.ROUND, b.creates), rounds_to_update=by_type(EntityType.ROUND, b.updates),
        questions_to_create=by_type(EntityType.QUESTION, b.creates), questions_to_update=by_type(EntityType.QUESTION, b.updates),
        topics_to_upsert=list(topics.values()),
        experience_company_links=company_links, experience_role_links=role_links,
        experience_round_links=round_links, experience_question_links=question_links,
        question_topic_links=topic_links, review_items=b.review,
        metadata=ExtractionMetadata(pipeline_version=PIPELINE_VERSION, warnings=data.warnings, counts={
            "companies": len(data.companies), "roles": len(data.roles), "rounds": len(data.rounds),
            "questions": len(data.questions), "new_entities": b.new_count, "matched_entities": b.matched_count,
            "needs_review": len(b.review)}),
    )
    _assert_refs_resolvable(payload)
    return payload