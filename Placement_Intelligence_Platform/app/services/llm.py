"""Centralized LLM abstraction. All agents use this; never import google.genai directly in agents."""
from __future__ import annotations

import logging
from typing import Optional, Type, TypeVar

from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger("llm_service")

T = TypeVar("T", bound=BaseModel)


class LLMService:
    """Thin, reusable wrapper around the Gemini API."""

    def __init__(self) -> None:
        self._client = None
        self._model = settings.llm_model
        api_key = settings.llm_api_key
        if api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=api_key)
                self._genai = genai
            except Exception as exc:
                logger.warning("Could not initialise Gemini client: %s", exc)
        else:
            logger.warning("LLM_API_KEY not set – LLM calls will return fallback text.")

    # ------------------------------------------------------------------
    def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        """Return a free-text completion for *prompt*."""
        if not self._client:
            return "[LLM unavailable – configure LLM_API_KEY]"
        try:
            from google.genai import types
            resp = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=temperature),
            )
            return resp.text or ""
        except Exception as exc:
            logger.error("generate_text failed: %s", exc)
            return f"[LLM error: {exc}]"

    # ------------------------------------------------------------------
    def generate_structured(self, prompt: str, schema: Type[T], temperature: float = 0.0) -> Optional[T]:
        """Return a parsed Pydantic *schema* instance, or None on failure."""
        if not self._client:
            return None
        try:
            from google.genai import types
            resp = self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=temperature,
                ),
            )
            return schema.model_validate_json(resp.text)
        except Exception as exc:
            logger.error("generate_structured failed for %s: %s", schema.__name__, exc)
            return None

    # ------------------------------------------------------------------
    def chat_completion(self, messages: list[dict[str, str]], system: Optional[str] = None) -> str:
        """Multi-turn chat completion. *messages* is a list of {role, content} dicts."""
        if not self._client:
            return "[LLM unavailable – configure LLM_API_KEY]"
        try:
            from google.genai import types
            contents = []
            if system:
                contents.append(types.Content(role="user", parts=[types.Part(text=system)]))
                contents.append(types.Content(role="model", parts=[types.Part(text="Understood.")]))
            for msg in messages:
                role = "model" if msg.get("role") == "assistant" else "user"
                contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
            resp = self._client.models.generate_content(
                model=self._model,
                contents=contents,
                config=types.GenerateContentConfig(temperature=0.7),
            )
            return resp.text or ""
        except Exception as exc:
            logger.error("chat_completion failed: %s", exc)
            return f"[LLM error: {exc}]"

# Module-level singleton
_llm: 'LLMService | None' = None

def get_llm() -> 'LLMService':
    global _llm
    if _llm is None:
        _llm = LLMService()
    return _llm

