"""Company search tool – all DB access via AgentRepository."""
from __future__ import annotations

import logging

from app.db.agent_repository import get_agent_repository

logger = logging.getLogger("tool.company_search")


class CompanySearchTool:
    def __init__(self) -> None:
        self._repo = get_agent_repository()

    def search(self, query: str, limit: int = 10) -> list[dict]:
        """Find canonical company records matching *query* (name ilike)."""
        return self._repo.find_companies(query, limit=limit)

    def get_experiences_count(self, company_name: str) -> int:
        """Return how many completed experiences exist for a company."""
        return self._repo.get_experience_count_for_company(company_name)
