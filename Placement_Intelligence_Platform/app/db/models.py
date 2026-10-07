from typing import Any

from pydantic import BaseModel


class IngestRequest(BaseModel):
    experience_id: str
    # Raw content sent by Team A on approval. When present, the row is upserted into
    # `experiences`; when absent, an existing row is re-queued (legacy behaviour).
    company_name: str | None = None
    role_title: str | None = None
    raw_content: str | None = None
    questions_summary: str | None = None
    tips: str | None = None
    questions: list[dict[str, Any]] | None = None
    interview_date: str | None = None
    difficulty: str | None = None

    def has_content(self) -> bool:
        return any(value is not None for key, value in self.model_dump().items() if key != "experience_id")


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
