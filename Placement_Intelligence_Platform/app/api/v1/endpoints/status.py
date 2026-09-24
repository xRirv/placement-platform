from fastapi import APIRouter, HTTPException
from app.db.repositories import JobRepository  # cite: 3

router = APIRouter()

@router.get("/internal/experiences/{experience_id}")
async def get_experience_status(experience_id: str):
    job = JobRepository.get_experience_by_id(experience_id)

    if not job:
        raise HTTPException(status_code=404, detail="Experience ID not found")

    return {
        "experience_id": job.get("experience_id"),
        "status": job.get("status"),
        "stage": job.get("stage"),
        "error": job.get("error"),
        "questions_summary": job.get("questions_summary"),
        "tips": job.get("tips"),
        "questions": job.get("questions")
    }