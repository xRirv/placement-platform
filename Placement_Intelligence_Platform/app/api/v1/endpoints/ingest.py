from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_api_key
from app.db.repositories import create_job
from app.mq.producer import enqueue_ingestion

router = APIRouter()


class IngestRequest(BaseModel):
    raw_text: str = Field(min_length=1)


class IngestResponse(BaseModel):
    job_id: str
    status: str


@router.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
def ingest(
    request: IngestRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_api_key),
) -> IngestResponse:
    job = create_job(db, request.raw_text)
    enqueue_ingestion(job.id)
    return IngestResponse(job_id=job.id, status=job.status)
