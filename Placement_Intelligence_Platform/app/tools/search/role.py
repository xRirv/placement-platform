"""Role search tools."""


class RoleSearchTool:
    """Searches for canonical role records."""

    def search(self, query: str):
        return {"query": query, "results": []}
