"""Master Agent Pydantic schemas."""
from __future__ import annotations

import uuid
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.schemas.agent import AgentAction, AgentContext, AgentEvidence


class IntentPlan(BaseModel):
    primary_intent: str  # "search" | "preparation" | "content" | "multi" | "follow_up"
    needs_search: bool = False
    needs_content: bool = False
    needs_preparation: bool = False
    company: Optional[str] = None
    role: Optional[str] = None
    topic: Optional[str] = None
    question: Optional[str] = None
    reasoning: str = ""


class MasterRequest(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context: Optional[AgentContext] = None


class MasterResponse(BaseModel):
    answer: str
    agent_used: str
    actions: list[AgentAction] = Field(default_factory=list)
    evidence: list[AgentEvidence] = Field(default_factory=list)
    session_id: str
    metadata: dict[str, Any] = Field(default_factory=dict)
