"""Pydantic schemas for the Content agent."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class ContentRequest(BaseModel):
    topic: str
    company: Optional[str] = None
    role: Optional[str] = None
    source_preference: str = "institutional_first"  # "institutional_first", "web", "institutional_only"
    caller_agent: Optional[str] = None


class ContentItem(BaseModel):
    title: str
    content: str
    source: str  # "database", "web", "llm_synthesis"
    url: Optional[str] = None
    confidence: float = 1.0


class ContentResult(BaseModel):
    topic: str
    items: list[ContentItem] = Field(default_factory=list)
    summary: Optional[str] = None
    source: str = "llm_synthesis"  # "database", "web", "synthesis", "cache"
    metadata: dict[str, Any] = Field(default_factory=dict)
