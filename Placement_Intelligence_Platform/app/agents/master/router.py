"""Master Agent intent classifier – LLM primary, regex fallback."""
from __future__ import annotations

import json
import logging
import re
from typing import Optional

from app.agents.master.prompts import INTENT_CLASSIFICATION_PROMPT
from app.agents.master.schemas import IntentPlan
from app.schemas.agent import AgentContext
from app.services.llm import get_llm

logger = logging.getLogger("agents.master.router")

_SEARCH_RE = re.compile(
    r"\b(what\s+questions?|which\s+questions?|questions?\s+asked|show\s+(?:me\s+)?questions?|"
    r"list\s+questions?|find\s+questions?|interview\s+questions?|asked\s+(?:at|in|for))\b",
    re.I,
)
_PREP_RE = re.compile(
    r"\b(prepar[ei]|study\s+plan|preparation\s+plan|prepare\s+me|help\s+me\s+prepar|"
    r"how\s+(?:do\s+i|should\s+i)\s+prepar|roadmap|schedule|get\s+ready|crack)\b",
    re.I,
)
_CONTENT_RE = re.compile(
    r"\b(tell\s+me\s+about|what\s+is|who\s+is|about\s+the\s+company|company\s+culture|"
    r"what\s+does|how\s+does|explain|overview|introduction\s+to)\b",
    re.I,
)


class MasterRouter:
    def __init__(self) -> None:
        self.llm = get_llm()

    def classify_intent(
        self, message: str, context: Optional[AgentContext] = None
    ) -> IntentPlan:
        history = ""
        if context and context.conversation_history:
            history = "\n".join(
                f"{m['role']}: {m['content'][:100]}"
                for m in context.conversation_history[-3:]
            )
        try:
            return self._llm_classify(message, history)
        except Exception as exc:
            logger.warning("LLM intent classification failed (%s); using regex fallback", exc)
            return self._regex_classify(message, context)

    # ------------------------------------------------------------------
    def _llm_classify(self, message: str, history: str) -> IntentPlan:
        prompt = INTENT_CLASSIFICATION_PROMPT.format(
            history=history or "None", query=message
        )
        raw = self.llm.generate_text(prompt, temperature=0.0)
        m = re.search(r"\{.*\}", raw, re.S)
        if not m:
            raise ValueError("No JSON in LLM response")
        data = json.loads(m.group())
        valid = {k: v for k, v in data.items() if k in IntentPlan.model_fields}
        return IntentPlan(**valid)

    def _regex_classify(
        self, message: str, context: Optional[AgentContext]
    ) -> IntentPlan:
        needs_search = bool(_SEARCH_RE.search(message))
        needs_prep = bool(_PREP_RE.search(message))
        needs_content = bool(_CONTENT_RE.search(message)) and not needs_search

        is_followup = False
        if context and context.conversation_history and len(message.split()) < 7:
            is_followup = True

        if is_followup:
            intent = "follow_up"
        elif needs_prep and needs_search:
            intent = "multi"
        elif needs_prep:
            intent = "preparation"
        elif needs_search:
            intent = "search"
        elif needs_content:
            intent = "content"
        else:
            intent = "search"

        return IntentPlan(
            primary_intent=intent,
            needs_search=needs_search or intent in ("search", "multi", "follow_up"),
            needs_content=needs_content,
            needs_preparation=needs_prep or intent == "preparation",
            reasoning="regex-based classification",
        )
