"""Question search tool – all DB access via AgentRepository."""
from __future__ import annotations

import logging
from typing import Optional

from app.db.agent_repository import get_agent_repository

logger = logging.getLogger("tool.question_search")


class QuestionSearchTool:
    def __init__(self) -> None:
        self._repo = get_agent_repository()

    def search_by_filters(
        self,
        company: Optional[str] = None,
        role: Optional[str] = None,
        topic: Optional[str] = None,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Return questions matching the given filters, sorted by occurrence count.

        Join path (from master_schema.sql):
            companies → experience_companies → experience_questions → question_canonical
        """
        try:
            # Step 1 – resolve experience_ids from company / role filters
            exp_ids_set: Optional[set[str]] = None

            if company:
                company_ids = self._repo.get_company_ids(company)
                if not company_ids:
                    return []
                ids = set(self._repo.get_experience_ids_for_company(company_ids))
                exp_ids_set = ids if exp_ids_set is None else exp_ids_set & ids

            if role:
                role_ids = self._repo.get_role_ids(role)
                if not role_ids:
                    return []
                ids = set(self._repo.get_experience_ids_for_role(role_ids))
                exp_ids_set = ids if exp_ids_set is None else exp_ids_set & ids

            experience_ids = list(exp_ids_set) if exp_ids_set is not None else []

            # Step 2 – get question_id → occurrence_count from experience_questions
            qid_counts = self._repo.get_question_ids_for_experiences(experience_ids)

            # Step 3 – fetch question rows from question_canonical with attr filters
            questions = self._repo.get_questions_by_ids(
                list(qid_counts.keys()), topic=topic, category=category,
                difficulty=difficulty, limit=limit,
            )

            # Step 4 – attach occurrence counts, sort, trim
            for q in questions:
                q["occurrence_count"] = qid_counts.get(q["id"], 1)
            questions.sort(key=lambda x: x["occurrence_count"], reverse=True)
            return questions[:limit]
        except Exception as exc:
            logger.error("search_by_filters failed: %s", exc)
            return []

    def search_by_text(self, text: str, limit: int = 20) -> list[dict]:
        """Full-text search on canonical_text (pg_trgm ilike)."""
        return self._repo.search_questions_by_text(text, limit=limit)
