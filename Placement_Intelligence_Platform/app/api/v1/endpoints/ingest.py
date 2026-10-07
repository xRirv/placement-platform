from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_internal_api_key

from app.db.models import IngestRequest, IngestResponse
from app.db.repositories import DatabaseError, SupabaseRepository
from app.mq.producer import publish_experience_id

router = APIRouter(dependencies=[Depends(require_internal_api_key)])


# Accept an experience submission, write it to Supabase, and queue it for processing
@router.post("/internal/ingest", status_code=status.HTTP_202_ACCEPTED, response_model=IngestResponse)
async def ingest_experience(payload: IngestRequest):
    # Write (or overwrite) the experience row in Supabase with QUEUED status
    try:
        repository = SupabaseRepository()
        if payload.has_content():
            repository.upsert_raw_experience(payload.model_dump())
        else:
            repository.update_raw_status(payload.experience_id, "QUEUED", stage="INGESTION", error=None)
    except DatabaseError as e:
        raise HTTPException(status_code=500, detail=f"Database write failed: {e}")

    # Publish the experience ID to RabbitMQ so a worker can pick it up
    queued = publish_experience_id(payload.experience_id)
    if not queued:
        raise HTTPException(status_code=500, detail="Failed to publish to message queue")

    return IngestResponse(
        experience_id=payload.experience_id,
        status="QUEUED",
        message="Experience queued for AI processing",
    )
