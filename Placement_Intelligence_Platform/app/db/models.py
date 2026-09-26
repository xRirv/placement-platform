from typing import Any

from pydantic import BaseModel


class IngestRequest(BaseModel):
    experience_id: str


class IngestResponse(BaseModel):
    experience_id: str
    status: str
    message: str


class ExperienceStatus(BaseModel):
    experience_id: str
    status: str | None = None
    stage: str | None = None
    error: str | None = None
    questions_summary: str | None = None
    tips: str | None = None
    questions: Any | None = None
