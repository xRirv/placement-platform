"""Search request/result contracts."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class SearchFilters(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    topic: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    round_type: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    filters: SearchFilters = Field(default_factory=SearchFilters)
    strategy: str = "auto"
    limit: int = 20
    caller_agent: Optional[str] = None


class QuestionResult(BaseModel):
    question_id: str
    canonical_text: str
    category: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    occurrence_count: int = 1
    companies: list[str] = Field(default_factory=list)
    roles: list[str] = Field(default_factory=list)
    similarity_score: Optional[float] = None


class SearchResult(BaseModel):
    query: str
    strategy_used: str = "sql"
    questions: list[QuestionResult] = Field(default_factory=list)
    experiences: list[dict] = Field(default_factory=list)
    total_found: int = 0
    evidence: list[dict] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
