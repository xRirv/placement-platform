"""Topic frequency search tool – all DB access via AgentRepository."""
from __future__ import annotations

import logging
from typing import Optional

from app.db.agent_repository import get_agent_repository

logger = logging.getLogger("tool.topic_search")


class TopicSearchTool:
    def __init__(self) -> None:
        self._repo = get_agent_repository()

    def get_top_topics(
        self,
        company: Optional[str] = None,
        role: Optional[str] = None,
        limit: int = 15,
    ) -> list[dict]:
        """Return most-frequent topics, optionally scoped to a company/role.

        Join path: companies → experience_companies → experience_questions
                   → question_topics → topics
        """
        try:
            question_ids = self._filtered_question_ids(company, role)

            # question_ids == None  → no company/role filter → global counts
            counts = self._repo.get_topic_question_counts(question_ids)
            if not counts:
                return []

            top_ids = sorted(counts, key=lambda k: counts[k], reverse=True)[:limit]
            topic_rows = self._repo.get_topics_by_ids(top_ids)

            result = [
                {
                    "topic_id": r["id"],
                    "category": r.get("category", ""),
                    "topic": r.get("topic", ""),
                    "question_count": counts.get(r["id"], 0),
                }
                for r in topic_rows
            ]
            result.sort(key=lambda x: x["question_count"], reverse=True)
            return result
        except Exception as exc:
            logger.error("TopicSearchTool error: %s", exc)
            return []

    # ------------------------------------------------------------------
    def _filtered_question_ids(
        self, company: Optional[str], role: Optional[str]
    ) -> Optional[list[str]]:
        """Resolve question IDs for the given company/role filter.
        Returns None when no filter is applied (triggers global count).
        """
        if not company and not role:
            return None

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
        if not experience_ids:
            return []

        qid_counts = self._repo.get_question_ids_for_experiences(experience_ids)
        return list(qid_counts.keys())
