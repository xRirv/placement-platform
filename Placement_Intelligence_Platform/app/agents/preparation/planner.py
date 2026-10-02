"""Planning logic for the preparation agent."""


class PreparationPlanner:
    """Plans preparation tasks."""

    def plan(self, item: str):
        return {"item": item, "steps": ["normalize", "validate", "finalize"]}
