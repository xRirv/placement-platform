"""Experience retrieval tool – all DB access via AgentRepository."""
from __future__ import annotations

import logging
from collections import Counter
from typing import Optional

from app.db.agent_repository import get_agent_repository

logger = logging.getLogger("tool.experience_search")


class ExperienceSearchTool:
    def __init__(self) -> None:
        self._repo = get_agent_repository()

    def get_by_company_role(
        self,
        company: Optional[str] = None,
        role: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict]:
        """Return completed experiences matching company and/or role.

        Uses the raw company_name / role_title columns on experiences
        (fast filter path – canonical lookup is in QuestionSearchTool).
        """
        return self._repo.get_experiences(company=company, role=role, limit=limit)

    def get_round_structure(self, company: Optional[str] = None) -> list[dict]:
        """Return round names and occurrence counts for a company.

        Join path: companies → experience_companies → rounds
        """
        try:
            if company:
                company_ids = self._repo.get_company_ids(company)
                if not company_ids:
                    return []
                experience_ids = self._repo.get_experience_ids_for_company(company_ids)
                if not experience_ids:
                    return []
            else:
                experience_ids = []  # empty → repo returns up-to-200 rows globally

            return self._repo.get_rounds_for_experiences(experience_ids)
        except Exception as exc:
            logger.error("get_round_structure failed: %s", exc)
            return []
