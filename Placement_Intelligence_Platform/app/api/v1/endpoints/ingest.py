from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.mq.producer import push_exp_id  # cite: 1
from app.db.repositories import JobRepository  # cite: 3

router = APIRouter()

class IngestRequest(BaseModel):
    experience_id: str

@router.post("/internal/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_experience(payload: IngestRequest):
    try:
        JobRepository.update_job_status(
            payload.experience_id,
            status="QUEUED",
            stage="INGESTION",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")

    is_queued = push_exp_id(payload.experience_id)

    if not is_queued:
        raise HTTPException(status_code=500, detail="Failed to queue experience_id")

    return {
        "experience_id": payload.experience_id,
        "status": "QUEUED",
        "message": "Experience queued for AI processing"
    }