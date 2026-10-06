"""Role search tool – all DB access via AgentRepository."""
from __future__ import annotations

import logging

from app.db.agent_repository import get_agent_repository

logger = logging.getLogger("tool.role_search")


class RoleSearchTool:
    def __init__(self) -> None:
        self._repo = get_agent_repository()

    def search(self, query: str, limit: int = 10) -> list[dict]:
        """Find canonical role records matching *query* (name ilike)."""
        return self._repo.find_roles(query, limit=limit)
