"""Read-side repository for the agent system.

All agent search tools funnel through this class instead of calling the
Supabase client directly.  Every method maps to the tables defined in
sql/master_schema.sql, following the exact FK relationships:

    experiences  ──< experience_companies >── companies
    experiences  ──< experience_roles     >── roles
    experiences  ──< experience_questions >── question_canonical
    experiences  ──< rounds
    question_canonical ──< question_topics >── topics
    companies / roles / question_canonical ──< entity_aliases

Views (added by alter_add_occurrence_count_and_view.sql):
    question_with_context – question_canonical + companies[] + roles[]
"""
from __future__ import annotations

import logging
from collections import Counter
from typing import Optional

from app.db.client import supabase

logger = logging.getLogger("db.agent_repository")


class AgentRepository:
    # ------------------------------------------------------------------ #
    # Companies                                                            #
    # ------------------------------------------------------------------ #

    def find_companies(self, query: str, limit: int = 10) -> list[dict]:
        """Search canonical companies by name or normalized_name (ilike)."""
        try:
            res = (
                supabase.table("companies")
                .select("id, name, normalized_name")
                .ilike("name", f"%{query}%")
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error("find_companies failed: %s", exc)
            return []

    def get_company_ids(self, company: str) -> list[str]:
        """Return IDs of companies whose name or normalized_name contains *company*."""
        try:
            norm = company.lower().strip()
            res = (
                supabase.table("companies")
                .select("id, name, normalized_name")
                .execute()
            )
            return [
                r["id"]
                for r in (res.data or [])
                if norm in (r.get("normalized_name") or "").lower()
                or norm in (r.get("name") or "").lower()
            ]
        except Exception as exc:
            logger.error("get_company_ids failed: %s", exc)
            return []

    def get_experience_count_for_company(self, company_name: str) -> int:
        """Count completed experiences where company_name matches (raw column)."""
        try:
            res = (
                supabase.table("experiences")
                .select("experience_id")
                .ilike("company_name", f"%{company_name}%")
                .eq("status", "COMPLETED")
                .execute()
            )
            return len(res.data or [])
        except Exception as exc:
            logger.error("get_experience_count_for_company failed: %s", exc)
            return 0

    # ------------------------------------------------------------------ #
    # Roles                                                                #
    # ------------------------------------------------------------------ #

    def find_roles(self, query: str, limit: int = 10) -> list[dict]:
        """Search canonical roles by name (ilike)."""
        try:
            res = (
                supabase.table("roles")
                .select("id, name, normalized_name")
                .ilike("name", f"%{query}%")
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error("find_roles failed: %s", exc)
            return []

    def get_role_ids(self, role: str) -> list[str]:
        """Return IDs of roles whose name or normalized_name contains *role*."""
        try:
            norm = role.lower().strip()
            res = (
                supabase.table("roles")
                .select("id, name, normalized_name")
                .execute()
            )
            return [
                r["id"]
                for r in (res.data or [])
                if norm in (r.get("normalized_name") or "").lower()
                or norm in (r.get("name") or "").lower()
            ]
        except Exception as exc:
            logger.error("get_role_ids failed: %s", exc)
            return []

    # ------------------------------------------------------------------ #
    # Experiences (via junction tables)                                    #
    # ------------------------------------------------------------------ #

    def get_experience_ids_for_company(self, company_ids: list[str]) -> list[str]:
        """
        experience_companies  →  experience_id list for the given company IDs.
        Schema: experience_companies(experience_id, company_id, is_primary)
        """
        if not company_ids:
            return []
        try:
            res = (
                supabase.table("experience_companies")
                .select("experience_id")
                .in_("company_id", company_ids)
                .execute()
            )
            return [r["experience_id"] for r in (res.data or [])]
        except Exception as exc:
            logger.error("get_experience_ids_for_company failed: %s", exc)
            return []

    def get_experience_ids_for_role(self, role_ids: list[str]) -> list[str]:
        """
        experience_roles  →  experience_id list for the given role IDs.
        Schema: experience_roles(experience_id, role_id, is_primary)
        """
        if not role_ids:
            return []
        try:
            res = (
                supabase.table("experience_roles")
                .select("experience_id")
                .in_("role_id", role_ids)
                .execute()
            )
            return [r["experience_id"] for r in (res.data or [])]
        except Exception as exc:
            logger.error("get_experience_ids_for_role failed: %s", exc)
            return []

    def get_experiences(
        self,
        company: Optional[str] = None,
        role: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict]:
        """
        Return completed experiences, filtered by raw company_name / role_title
        columns (fast path for ExperienceSearchTool).
        """
        try:
            q = (
                supabase.table("experiences")
                .select("experience_id, company_name, role_title, difficulty, status, stage, created_at")
                .eq("status", "COMPLETED")
            )
            if company:
                q = q.ilike("company_name", f"%{company}%")
            if role:
                q = q.ilike("role_title", f"%{role}%")
            res = q.limit(limit).execute()
            return res.data or []
        except Exception as exc:
            logger.error("get_experiences failed: %s", exc)
            return []

    # ------------------------------------------------------------------ #
    # Questions                                                            #
    # ------------------------------------------------------------------ #

    def get_question_ids_for_experiences(
        self, experience_ids: list[str]
    ) -> dict[str, int]:
        """
        experience_questions  →  {question_id: occurrence_count}.
        Schema: experience_questions(experience_id, question_id, round_id, question_order, asked_text)
        Capped at 2 000 rows when no filter is applied.
        """
        try:
            if experience_ids:
                res = (
                    supabase.table("experience_questions")
                    .select("question_id")
                    .in_("experience_id", experience_ids)
                    .execute()
                )
            else:
                res = (
                    supabase.table("experience_questions")
                    .select("question_id")
                    .limit(2000)
                    .execute()
                )
            counter: Counter[str] = Counter()
            for row in res.data or []:
                counter[row["question_id"]] += 1
            return dict(counter)
        except Exception as exc:
            logger.error("get_question_ids_for_experiences failed: %s", exc)
            return {}

    def get_questions_by_ids(
        self,
        question_ids: list[str],
        topic: Optional[str] = None,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict]:
        """
        Fetch from the question_with_context VIEW so that companies[] and
        roles[] are included in each row alongside the occurrence_count column.

        Falls back to question_canonical if the view is not yet present
        (i.e. the migration has not been run yet).

        Queries in batches of 200 to stay within the Supabase REST .in_() limit.
        """
        table = "question_with_context"

        if not question_ids:
            q = supabase.table(table).select("*")
            if category:
                q = q.ilike("category", f"%{category}%")
            if topic:
                q = q.ilike("topic", f"%{topic}%")
            if difficulty:
                q = q.eq("difficulty", difficulty.upper())
            try:
                return q.limit(limit * 3).execute().data or []
            except Exception:
                # View not yet created — fall back to base table
                try:
                    q2 = supabase.table("question_canonical").select("*")
                    if category:
                        q2 = q2.ilike("category", f"%{category}%")
                    if topic:
                        q2 = q2.ilike("topic", f"%{topic}%")
                    if difficulty:
                        q2 = q2.eq("difficulty", difficulty.upper())
                    return q2.limit(limit * 3).execute().data or []
                except Exception as exc2:
                    logger.error("get_questions_by_ids (no ids) failed: %s", exc2)
                    return []

        results: list[dict] = []
        try:
            for i in range(0, len(question_ids), 200):
                batch = question_ids[i : i + 200]
                q = supabase.table(table).select("*").in_("id", batch)
                if category:
                    q = q.ilike("category", f"%{category}%")
                if topic:
                    q = q.ilike("topic", f"%{topic}%")
                if difficulty:
                    q = q.eq("difficulty", difficulty.upper())
                try:
                    results.extend(q.execute().data or [])
                except Exception:
                    # View not yet created — fall back to base table
                    q2 = supabase.table("question_canonical").select("*").in_("id", batch)
                    if category:
                        q2 = q2.ilike("category", f"%{category}%")
                    if topic:
                        q2 = q2.ilike("topic", f"%{topic}%")
                    if difficulty:
                        q2 = q2.eq("difficulty", difficulty.upper())
                    results.extend(q2.execute().data or [])
        except Exception as exc:
            logger.error("get_questions_by_ids failed: %s", exc)
        return results

    def search_questions_by_text(self, text: str, limit: int = 20) -> list[dict]:
        """
        Full-text search on canonical_text via question_with_context view.
        (Index: questions_text_trgm_idx on question_canonical using gin)
        """
        try:
            res = (
                supabase.table("question_with_context")
                .select("*")
                .ilike("canonical_text", f"%{text}%")
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception:
            try:
                res = (
                    supabase.table("question_canonical")
                    .select("*")
                    .ilike("canonical_text", f"%{text}%")
                    .limit(limit)
                    .execute()
                )
                return res.data or []
            except Exception as exc2:
                logger.error("search_questions_by_text failed: %s", exc2)
                return []

    # ------------------------------------------------------------------ #
    # Topics                                                               #
    # ------------------------------------------------------------------ #

    def get_question_ids_for_topic_filter(
        self, question_ids: list[str]
    ) -> list[tuple[str, str]]:
        """
        question_topics  →  [(question_id, topic_id)] for the given question IDs.
        Schema: question_topics(question_id, topic_id, confidence, source)
        """
        if not question_ids:
            return []
        try:
            res = (
                supabase.table("question_topics")
                .select("question_id, topic_id")
                .in_("question_id", question_ids[:500])
                .execute()
            )
            return [(r["question_id"], r["topic_id"]) for r in (res.data or [])]
        except Exception as exc:
            logger.error("get_question_ids_for_topic_filter failed: %s", exc)
            return []

    def get_topic_question_counts(
        self, question_ids: Optional[list[str]] = None
    ) -> dict[str, int]:
        """
        Return {topic_id: question_count}.
        If question_ids is None, counts across all questions (global).
        Schema: question_topics(question_id, topic_id)
        """
        try:
            if question_ids is None:
                res = (
                    supabase.table("question_topics")
                    .select("topic_id, question_id")
                    .execute()
                )
            else:
                if not question_ids:
                    return {}
                res = (
                    supabase.table("question_topics")
                    .select("topic_id, question_id")
                    .in_("question_id", question_ids[:500])
                    .execute()
                )
            counts: dict[str, int] = {}
            for row in res.data or []:
                tid = row.get("topic_id")
                if tid:
                    counts[tid] = counts.get(tid, 0) + 1
            return counts
        except Exception as exc:
            logger.error("get_topic_question_counts failed: %s", exc)
            return {}

    def get_topics_by_ids(self, topic_ids: list[str]) -> list[dict]:
        """
        Fetch rows from topics for the given IDs.
        Schema: topics(id, category, topic, subtopic)
        """
        if not topic_ids:
            return []
        try:
            res = (
                supabase.table("topics")
                .select("id, category, topic, subtopic")
                .in_("id", topic_ids)
                .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error("get_topics_by_ids failed: %s", exc)
            return []

    # ------------------------------------------------------------------ #
    # Rounds                                                               #
    # ------------------------------------------------------------------ #

    def get_rounds_for_experiences(self, experience_ids: list[str]) -> list[dict]:
        """
        Fetch rounds linked to the given experiences.
        If experience_ids is empty, returns a global sample (up to 200 rows).
        Schema: rounds(id, experience_id, round_number, round_name,
                       round_format, duration_minutes, order_index)
        """
        try:
            q = supabase.table("rounds").select(
                "round_name, round_number, order_index, round_format, duration_minutes"
            )
            if experience_ids:
                q = q.in_("experience_id", experience_ids[:200])
            res = q.limit(200).execute()
            return res.data or []
        except Exception as exc:
            logger.error("get_rounds_for_experiences failed: %s", exc)
            return []

    # ------------------------------------------------------------------ #
    # Topics – direct search                                               #
    # ------------------------------------------------------------------ #

    def search_topics_by_name(self, topic: str, limit: int = 10) -> list[dict]:
        """
        Search the topics table by topic name (ilike).
        Schema: topics(id, category, topic, subtopic)
        """
        try:
            res = (
                supabase.table("topics")
                .select("id, category, topic, subtopic")
                .ilike("topic", f"%{topic}%")
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error("search_topics_by_name failed: %s", exc)
            return []

    def find_companies_by_normalized_name(self, normalized: str, limit: int = 3) -> list[dict]:
        """
        Exact normalized_name lookup used by ContentAgent.
        Schema: companies(id, name, normalized_name)
        """
        try:
            res = (
                supabase.table("companies")
                .select("id, name, normalized_name")
                .ilike("normalized_name", normalized.lower().strip())
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as exc:
            logger.error("find_companies_by_normalized_name failed: %s", exc)
            return []


# Singleton used by all tools
_repo: Optional[AgentRepository] = None


def get_agent_repository() -> AgentRepository:
    global _repo
    if _repo is None:
        _repo = AgentRepository()
    return _repo
