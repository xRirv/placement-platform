from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ResolutionDecision(BaseModel):
    decision: str = Field(..., description="MATCH_EXISTING, CREATE_NEW, or NEED_REVIEW")
    candidate_id: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str

class LLMResolver(ABC):
    @abstractmethod
    def resolve_ambiguity(
        self, 
        entity_type: str, 
        extracted_text: str, 
        candidates: List[Dict[str, Any]]
    ) -> ResolutionDecision:
        """Evaluates low-confidence entity matches and returns a structured decision."""
        pass