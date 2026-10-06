"""Search strategy planner – decides SQL vs vector vs hybrid."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from app.schemas.search import SearchFilters, SearchRequest

_COMPANY_RE = re.compile(
    r"\b(?:at|in|for|with|from)\s+([A-Z][A-Za-z0-9&'\-]+(?:\s+[A-Z][A-Za-z0-9&'\-]+){0,3})\b"
)
_ROLE_RE = re.compile(
    r"\b(sde|swe|software\s+(?:development\s+)?engineer|data\s+scientist|data\s+analyst|"
    r"backend\s+developer|frontend\s+developer|full\s+stack|ml\s+engineer|"
    r"machine\s+learning\s+engineer|analyst|developer|engineer|intern|trainee)\b",
    re.I,
)
_SEMANTIC_RE = re.compile(
    r"\b(?:similar|like|related|equivalent|same\s+as|resembl)\b", re.I
)


@dataclass
class SearchPlan:
    strategy: str
    use_sql: bool = True
    use_vector: bool = False
    enriched_filters: SearchFilters = field(default_factory=SearchFilters)
    reasoning: str = ""


class SearchPlanner:
    def plan(self, request: SearchRequest) -> SearchPlan:
        filters = request.filters.model_copy()
        query = request.query

        if not filters.company:
            m = _COMPANY_RE.search(query)
            if m:
                filters.company = m.group(1).strip()

        if not filters.role:
            m = _ROLE_RE.search(query)
            if m:
                filters.role = m.group(1).strip()

        has_semantic = bool(_SEMANTIC_RE.search(query))
        has_structured = bool(
            filters.company or filters.role or filters.topic or filters.category
        )

        if request.strategy == "sql":
            strategy = "sql"
        elif request.strategy == "vector":
            strategy = "vector"
        elif request.strategy == "hybrid":
            strategy = "hybrid"
        elif has_structured and has_semantic:
            strategy = "hybrid"
        elif has_semantic:
            strategy = "vector"
        else:
            strategy = "sql"

        return SearchPlan(
            strategy=strategy,
            use_sql=strategy in ("sql", "hybrid"),
            use_vector=strategy in ("vector", "hybrid"),
            enriched_filters=filters,
            reasoning=(
                f"structured={'yes' if has_structured else 'no'}, "
                f"semantic={'yes' if has_semantic else 'no'}"
            ),
        )
