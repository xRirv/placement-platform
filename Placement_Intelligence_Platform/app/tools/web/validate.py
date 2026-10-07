"""Web content relevance validation."""
from __future__ import annotations

_MIN_WORDS = 30


class ContentValidateTool:
    def validate(self, content: str, topic: str) -> bool:
        if not content or len(content.split()) < _MIN_WORDS:
            return False
        topic_words = [w for w in topic.lower().split() if len(w) > 3]
        lower = content.lower()
        return any(w in lower for w in topic_words)
