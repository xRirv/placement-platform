"""Question search tools."""


class QuestionSearchTool:
    """Searches for canonical questions."""

    def search(self, query: str):
        return {"query": query, "results": []}
