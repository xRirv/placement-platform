import os
import logging
from typing import Optional, List
from google import genai
from google.genai import types

from app.ai_pipeline.stages.normalize import NormalizedEntity
from app.ai_pipeline.stages.resolve import LLMResolver, LLMVerdict, MatchScore

logger = logging.getLogger("llm_resolver")

class GeminiLLMResolver(LLMResolver):
    """Concrete Gemini implementation satisfying resolve.py's LLMResolver protocol."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.5-flash"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY")
        self.model_name = os.getenv("LLM_MODEL", model_name)
        
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("Gemini API Key missing. LLM fallback will abstain (return None).")

    def decide(self, entity: NormalizedEntity, candidates: List[MatchScore]) -> Optional[LLMVerdict]:
        """
        Called ONLY when entity score falls in NEED_REVIEW band.
        Returns LLMVerdict(match_id=...) if a match is determined,
        LLMVerdict(match_id=None) if it's a new entity, or None to abstain.
        """
        if not self.client or not candidates:
            return None

        formatted_candidates = [
            {"candidate_id": c.entity_id, "name": c.canonical_name, "score": c.score}
            for c in candidates
        ]

        prompt = (
            f"You are an entity resolution engine for interview intelligence data.\n"
            f"Entity Type: {entity.entity_type.value}\n"
            f"Extracted Value: \"{entity.original_value}\" (Normalized: \"{entity.normalized_value}\")\n"
            f"Candidate Matches from Database: {formatted_candidates}\n\n"
            f"Decide if the extracted value matches one of the candidates.\n"
            f"- If it matches a candidate, set match_id to that candidate_id.\n"
            f"- If none match and it should be created as a new entity, set match_id to null."
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=LLMVerdict,
                    temperature=0.0,
                ),
            )
            return LLMVerdict.model_validate_json(response.text)

        except Exception as e:
            logger.error(f"LLM resolution failed for '{entity.normalized_value}': {str(e)}. Abstaining.")
            return None