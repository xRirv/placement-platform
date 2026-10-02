"""Schemas for the content agent."""


class ContentRequest:
    """Input schema for content tasks."""

    def __init__(self, source: str):
        self.source = source
