"""Company search tools."""


class CompanySearchTool:
    """Searches for canonical company records."""

    def search(self, query: str):
        return {"query": query, "results": []}
