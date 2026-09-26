from fastapi import APIRouter, HTTPException

from app.db.models import ExperienceStatus
from app.db.repositories import JobRepository

router = APIRouter()


# Retrieve the current processing state and extracted results for an experience
@router.get("/internal/experiences/{experience_id}", response_model=ExperienceStatus)
async def get_experience_status(experience_id: str):
    # Look up the experience row in Supabase
    record = JobRepository.get_experience_by_id(experience_id)
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
