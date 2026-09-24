from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime

class ExperienceJob(BaseModel):
    experience_id: str
    company_id: Optional[str] = None
    role: Optional[str] = None
    interview_date: Optional[str] = None
    experience_text: Optional[str] = None
    submitted_at: Optional[str] = None
    
    # Status tracking
    status: str = "QUEUED"
    stage: str = "INGESTION"
    error: Optional[str] = None
    
    # Extraction outcomes
    questions_summary: Optional[str] = None
    tips: Optional[str] = None
    questions: Optional[Any] = None  # Accepts List or Dict; Supabase inserts this as JSONB
    
    created_at: Optional[str] = None
    completed_at: Optional[str] = None