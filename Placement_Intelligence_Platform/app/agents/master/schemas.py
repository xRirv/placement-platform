"""Schemas for the master agent."""


class MasterRequest:
    """Request model for master orchestration."""

    def __init__(self, query: str):
        self.query = query
