"""Vector search utilities."""


class VectorSearchTool:
    """Performs semantic retrieval."""

    def search(self, query: str):
        return {"query": query, "results": []}
