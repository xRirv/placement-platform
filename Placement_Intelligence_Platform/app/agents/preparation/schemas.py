"""Schemas for the preparation agent."""


class PreparationRequest:
    """Input schema for preparation tasks."""

    def __init__(self, item: str):
        self.item = item
