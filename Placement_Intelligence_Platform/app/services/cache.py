"""Simple in-memory cache with TTL. No external dependency required."""
from __future__ import annotations

import time
from typing import Any, Optional


class CacheService:
    def __init__(self, default_ttl: int = 3600) -> None:
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expires_at)
        self._default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        expires_at = time.time() + (ttl if ttl is not None else self._default_ttl)
        self._store[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def make_key(self, *parts: str) -> str:
        return ":".join(str(p).lower().strip() for p in parts if p)


# Module-level singleton so all agents share the same cache within a process.
cache = CacheService()


def get_cache() -> CacheService:
    return cache
