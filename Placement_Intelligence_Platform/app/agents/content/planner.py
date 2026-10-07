"""Content planning logic."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ContentPlan:
    check_institutional: bool = True
    check_web: bool = False
    use_llm_synthesis: bool = True
    cache_key: str = ""


class ContentPlanner:
    def plan(
        self, topic: str, company: str | None, source_preference: str
    ) -> ContentPlan:
        check_inst = source_preference in ("institutional_first", "institutional_only")
        check_web = source_preference in ("institutional_first", "web")
        parts = [p for p in [topic, company] if p]
        key = ":".join(parts).lower().replace(" ", "_")
        return ContentPlan(
            check_institutional=check_inst,
            check_web=check_web,
            use_llm_synthesis=True,
            cache_key=f"content:{key}",
        )
