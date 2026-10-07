"""Content cache helper."""
from __future__ import annotations

from typing import Optional

from app.schemas.content import ContentResult
from app.services.cache import get_cache

_TTL = 7200


class ContentCacheHelper:
    def __init__(self) -> None:
        self._c = get_cache()

    def get(self, topic: str, company: Optional[str] = None) -> Optional[ContentResult]:
        data = self._c.get(self._key(topic, company))
        if data is None:
            return None
        try:
            return ContentResult.model_validate(data)
        except Exception:
            return None

    def set(self, topic: str, result: ContentResult, company: Optional[str] = None) -> None:
        self._c.set(self._key(topic, company), result.model_dump(), ttl=_TTL)

    @staticmethod
    def _key(topic: str, company: Optional[str]) -> str:
        parts = [p.lower().replace(" ", "_") for p in [topic, company or ""] if p]
        return "content:" + ":".join(parts)
