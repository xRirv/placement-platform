"""Vector similarity search – gracefully disabled if pgvector is not configured."""
from __future__ import annotations

import logging
from typing import Optional

from app.db.client import supabase

logger = logging.getLogger("tool.vector_search")
_available: Optional[bool] = None


class VectorSearchTool:
    def is_available(self) -> bool:
        global _available
        if _available is not None:
            return _available
        try:
            supabase.table("question_canonical").select("embedding").limit(1).execute()
            _available = True
        except Exception:
            _available = False
        logger.info("Vector search available: %s", _available)
        return _available

    def search_similar(
        self,
        query_embedding: list[float],
        limit: int = 10,
    ) -> list[dict]:
        if not self.is_available():
            return []
        try:
            res = supabase.rpc(
                "match_questions",
                {"query_embedding": query_embedding, "match_count": limit},
            ).execute()
            return res.data or []
        except Exception as exc:
            logger.error("Vector search failed: %s", exc)
            return []
