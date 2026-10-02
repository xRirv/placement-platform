"""Planning logic for the search agent."""


class SearchPlanner:
    """Plans retrieval steps for a user request."""

    def plan(self, query: str):
        return {"query": query, "steps": ["expand", "retrieve", "rank"]}
