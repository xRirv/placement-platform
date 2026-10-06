"""Preparation cache helper."""
from __future__ import annotations

from typing import Optional

from app.schemas.preparation import PreparationResult
from app.services.cache import get_cache

_TTL = 3600


class PreparationCacheHelper:
    def __init__(self) -> None:
        self._c = get_cache()

    def get(self, company: Optional[str], role: Optional[str]) -> Optional[PreparationResult]:
        data = self._c.get(self._key(company, role))
        if data is None:
            return None
        try:
            return PreparationResult.model_validate(data)
        except Exception:
            return None

    def set(self, company: Optional[str], role: Optional[str], result: PreparationResult) -> None:
        self._c.set(self._key(company, role), result.model_dump(), ttl=_TTL)

    @staticmethod
    def _key(company: Optional[str], role: Optional[str]) -> str:
        parts = [p.lower().replace(" ", "_") for p in [company or "", role or ""] if p]
        return "preparation:" + ":".join(parts)
