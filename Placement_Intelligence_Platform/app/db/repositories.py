from datetime import datetime, timezone

from app.db.client import supabase


class JobRepository:

    # Insert a new experience with QUEUED status, or reset an existing one to QUEUED
    @staticmethod
    def queue_experience(experience_id: str):
        row = {
            "experience_id": experience_id,
            "status": "QUEUED",
            "stage": "INGESTION",
            "error": None,
        }
        # Upsert so re-submitting the same ID restarts processing instead of failing
        response = supabase.table("experiences").upsert(row).execute()
        return response.data

    # Fetch a single experience row by its primary key, or None if not found
    @staticmethod
    def get_experience_by_id(experience_id: str):
        response = (
            supabase.table("experiences")
            .select("*")
            .eq("experience_id", experience_id)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None

    # Update the processing status and stage for an in-progress experience
    @staticmethod
    def update_job_status(experience_id: str, status: str, stage: str = None, error: str = None):
        update_data = {"status": status}
        if stage:
            update_data["stage"] = stage
        if error is not None:
            update_data["error"] = error

        response = (
            supabase.table("experiences")
            .update(update_data)
            .eq("experience_id", experience_id)
            .execute()
        )
        return response.data

    # Mark an experience as COMPLETED and store the AI-extracted results
    @staticmethod
    def complete_job(experience_id: str, questions_summary: str, tips: str, questions: list):
        update_data = {
            "status": "COMPLETED",
            "stage": "EMBEDDING",
            "questions_summary": questions_summary,
            "tips": tips,
            "questions": questions,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        response = (
            supabase.table("experiences")
            .update(update_data)
            .eq("experience_id", experience_id)
            .execute()
        )
        return response.data
