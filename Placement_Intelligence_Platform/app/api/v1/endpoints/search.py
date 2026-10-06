"""Knowledge search endpoint."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.agents.search.agent import SearchAgent
from app.schemas.search import SearchRequest, SearchResult

router = APIRouter()
_search = SearchAgent()


@router.post("/search", response_model=SearchResult)
async def search_knowledge(request: SearchRequest) -> SearchResult:
    """Search the institutional knowledge base."""
    try:
        return _search.run(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
