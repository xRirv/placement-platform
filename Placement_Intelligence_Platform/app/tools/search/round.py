"""Round structure search tool – all DB access via AgentRepository."""
from __future__ import annotations

import logging
from collections import Counter

from app.db.agent_repository import get_agent_repository

logger = logging.getLogger("tool.round_search")


class RoundSearchTool:
    def __init__(self) -> None:
        self._repo = get_agent_repository()

    def get_round_structure_for_company(
        self, company: str, limit: int = 50
    ) -> list[dict]:
        """Return typical round types seen for a company, sorted by frequency.

        Join path (master_schema.sql):
            companies → experience_companies → rounds
        """
        try:
            company_ids = self._repo.get_company_ids(company)
            if not company_ids:
                return []

            experience_ids = self._repo.get_experience_ids_for_company(company_ids)
            if not experience_ids:
                return []

            rounds = self._repo.get_rounds_for_experiences(experience_ids)

            counts: Counter[str] = Counter()
            for r in rounds:
                name = r.get("round_name") or "UNKNOWN"
                counts[name] += 1

            return [
                {"round_name": name, "occurrence_count": cnt}
                for name, cnt in counts.most_common(limit)
            ]
        except Exception as exc:
            logger.error("RoundSearchTool error: %s", exc)
            return []
