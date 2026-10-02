"""Topic search tools."""


class TopicSearchTool:
    """Searches for topic metadata."""

    def search(self, query: str):
        return {"query": query, "results": []}
