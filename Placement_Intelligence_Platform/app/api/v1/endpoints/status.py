from fastapi import APIRouter, Depends, HTTPException

from app.core.security import require_internal_api_key

from app.db.models import ExperienceStatus
from app.db.repositories import SupabaseRepository

router = APIRouter(dependencies=[Depends(require_internal_api_key)])


# Retrieve the current processing state and extracted results for an experience
@router.get("/internal/experiences/{experience_id}", response_model=ExperienceStatus)
async def get_experience_status(experience_id: str):
    # Look up the experience row in Supabase
    try:
        record = SupabaseRepository().fetch_raw_experience(experience_id)
    except Exception as exc:
        if "No experience found" in str(exc):
            raise HTTPException(status_code=404, detail="Experience ID not found") from exc
        raise HTTPException(status_code=500, detail="Database read failed") from exc
    if not record:
        raise HTTPException(status_code=404, detail="Experience ID not found")

    # Map the Supabase row dict to the typed response schema
    return ExperienceStatus(
        experience_id=record.get("experience_id"),
        status=record.get("status"),
        stage=record.get("stage"),
        error=record.get("error"),
        questions_summary=record.get("questions_summary"),
        tips=record.get("tips"),
        questions=record.get("questions"),
    )
