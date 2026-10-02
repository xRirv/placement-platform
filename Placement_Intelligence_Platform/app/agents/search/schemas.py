"""Schemas for the search agent."""


class SearchRequest:
    """Input schema for search tasks."""

    def __init__(self, query: str):
        self.query = query
