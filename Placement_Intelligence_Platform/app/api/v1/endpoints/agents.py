"""Agent API endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.agents.master.agent import MasterAgent
from app.agents.master.schemas import MasterRequest, MasterResponse
from app.agents.preparation.agent import PreparationAgent
from app.schemas.preparation import PreparationRequest, PreparationResult

router = APIRouter()

# Singletons – one instance per process
_master = MasterAgent()
_prep = PreparationAgent()


@router.post("/agents/chat", response_model=MasterResponse)
async def agent_chat(request: MasterRequest) -> MasterResponse:
    """Send a message to the Master Agent."""
    try:
        return _master.run(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/agents/preparation", response_model=PreparationResult)
async def agent_preparation(request: PreparationRequest) -> PreparationResult:
    """Request a preparation plan directly from the Preparation Agent."""
    try:
        return _prep.run(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/agents/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve session history."""
    session = MasterAgent.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump()
