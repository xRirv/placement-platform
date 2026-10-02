"""Planning logic for the content agent."""


class ContentPlanner:
    """Plans content gathering and synthesis steps."""

    def plan(self, source: str):
        return {"source": source, "steps": ["collect", "summarize", "validate"]}
