"""Shared Pydantic contracts for the agent system."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentContext(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    conversation_history: list[dict[str, str]] = Field(default_factory=list)
    last_preparation_result: Optional[dict] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentRequest(BaseModel):
    message: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context: Optional[AgentContext] = None
    caller_agent: Optional[str] = None


class AgentEvidence(BaseModel):
    source: str  # "database", "vector", "web", "cache", "llm"
    content: Any
    confidence: float = 1.0
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentAction(BaseModel):
    agent_or_tool: str
    input: Any = None
    output: Optional[Any] = None
    duration_ms: Optional[float] = None
    status: str = "completed"


class AgentResult(BaseModel):
    agent: str
    answer: str
    evidence: list[AgentEvidence] = Field(default_factory=list)
    actions: list[AgentAction] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class AgentSession(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    messages: list[dict[str, str]] = Field(default_factory=list)
    last_result: Optional[AgentResult] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
