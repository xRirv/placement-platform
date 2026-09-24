from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_internal_api_key
from app.db.repositories import get_job

router = APIRouter()


@router.get("/ingest/{job_id}")
def get_ingestion_status(
    job_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_internal_api_key),
) -> dict:
    job = get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return {"job_id": job.id, "status": job.status, "result": job.result, "error": job.error}
