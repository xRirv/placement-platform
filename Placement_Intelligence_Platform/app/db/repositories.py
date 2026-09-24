from app.db.client import supabase
from datetime import datetime

class JobRepository:

    @staticmethod
    def get_experience_by_id(experience_id: str):
        """Queries status and extraction data by experience_id."""
        response = supabase.table("experiences").select("*").eq("experience_id", experience_id).execute()
        if response.data:
            return response.data[0]
        return None

    @staticmethod
    def update_job_status(experience_id: str, status: str, stage: str = None, error: str = None):
        """Updates progression or failure status."""
        update_data = {"status": status}
        if stage:
            update_data["stage"] = stage
        if error is not None:
            update_data["error"] = error
            
        response = supabase.table("experiences").update(update_data).eq("experience_id", experience_id).execute()
        return response.data

    @staticmethod
    def complete_job(experience_id: str, questions_summary: str, tips: str, questions: list):
        """Saves final extracted output and marks the experience as COMPLETED."""
        update_data = {
            "status": "COMPLETED",
            "stage": "EMBEDDING",
            "questions_summary": questions_summary,
            "tips": tips,
            "questions": questions,  # Supabase client handles converting Python list/dict to JSONB
            "completed_at": datetime.utcnow().isoformat()
        }
        response = supabase.table("experiences").update(update_data).eq("experience_id", experience_id).execute()
        return response.data