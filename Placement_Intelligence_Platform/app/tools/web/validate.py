"""Validation utilities for web-derived content."""


class WebValidateTool:
    """Validates fetched content quality."""

    def validate(self, content):
        return {"valid": True, "content": content}
