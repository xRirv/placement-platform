"""Routing logic for the master agent."""


class MasterRouter:
    """Routes requests to downstream agents."""

    def route(self, request):
        return {"request": request, "target": "search"}
