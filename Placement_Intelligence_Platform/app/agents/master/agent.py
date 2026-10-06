"""Master Agent – top-level supervisor of the entire agent hierarchy.

Hierarchy:
  MasterAgent
    ├── SearchAgent   (specialist)
    ├── ContentAgent  (specialist)
    └── PreparationAgent  (supervisor: calls Search + Content)
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Optional

from app.agents.content.agent import ContentAgent
from app.agents.master.prompts import SYNTHESIS_PROMPT
from app.agents.master.router import MasterRouter
from app.agents.master.schemas import IntentPlan, MasterRequest, MasterResponse
from app.agents.preparation.agent import PreparationAgent
from app.agents.search.agent import SearchAgent
from app.schemas.agent import AgentAction, AgentContext, AgentEvidence, AgentSession
from app.schemas.content import ContentRequest
from app.schemas.preparation import PreparationRequest
from app.schemas.search import SearchFilters, SearchRequest
from app.services.llm import get_llm

logger = logging.getLogger("agents.master")

_sessions: dict[str, AgentSession] = {}


class MasterAgent:
    """Top-level supervisor. Orchestrates Search, Content, and Preparation agents."""

    ALLOWED_DELEGATES: set = {"search", "content", "preparation"}

    def __init__(self) -> None:
        self.search_agent = SearchAgent()
        self.content_agent = ContentAgent()
        self.preparation_agent = PreparationAgent()
        self.router = MasterRouter()
        self.llm = get_llm()

    # ------------------------------------------------------------------
    def run(self, request: MasterRequest) -> MasterResponse:
        logger.info(
            "MasterAgent session=%s msg=%s", request.session_id, request.message[:80]
        )
        session = self._get_or_create_session(request.session_id)

        context = request.context or AgentContext(session_id=request.session_id)
        if not context.conversation_history:
            context.conversation_history = list(session.messages)

        plan = self.router.classify_intent(request.message, context)
        logger.info(
            "MasterAgent intent=%s company=%s role=%s",
            plan.primary_intent,
            plan.company,
            plan.role,
        )

        actions: list[AgentAction] = []
        evidence: list[AgentEvidence] = []
        agent_used = plan.primary_intent
        answer = ""

        try:
            if plan.primary_intent == "follow_up":
                answer = self._follow_up(request.message, session)
                agent_used = "follow_up"

            elif plan.needs_preparation:
                prep = self._call_preparation(plan, actions)
                agent_used = "preparation"
                if prep.metadata.get("search_questions_found", 0) > 0:
                    evidence.append(
                        AgentEvidence(
                            source="institutional_database",
                            content=f"{prep.metadata['search_questions_found']} questions",
                            confidence=1.0,
                        )
                    )
                agent_text = self._prep_to_text(prep)
                answer = self._synthesize(request.message, agent_text)

            elif plan.needs_search:
                sr = self._call_search(plan, actions)
                agent_used = "search"
                if sr.questions:
                    evidence.append(
                        AgentEvidence(
                            source="institutional_database",
                            content={"questions": [q.model_dump() for q in sr.questions[:5]]},
                            confidence=0.95,
                        )
                    )
                agent_text = self._search_to_text(sr)
                answer = self._synthesize(request.message, agent_text)

            elif plan.needs_content:
                cr = self._call_content(plan, actions)
                agent_used = "content"
                agent_text = f"CONTENT ({cr.source}):\n{cr.summary or ''}"
                answer = self._synthesize(request.message, agent_text)

            else:
                sr = self._call_search(plan, actions)
                agent_used = "search"
                agent_text = self._search_to_text(sr)
                answer = self._synthesize(request.message, agent_text)

        except Exception as exc:
            logger.exception("MasterAgent error: %s", exc)
            answer = (
                "I encountered an issue processing your request. "
                f"Please try again. ({type(exc).__name__})"
            )
            agent_used = "error"

        session.messages.append({"role": "user", "content": request.message})
        session.messages.append({"role": "assistant", "content": answer})
        session.updated_at = datetime.now(timezone.utc)
        _sessions[request.session_id] = session

        return MasterResponse(
            answer=answer,
            agent_used=agent_used,
            actions=actions,
            evidence=evidence,
            session_id=request.session_id,
            metadata={"intent": plan.primary_intent, "plan": plan.model_dump()},
        )

    # ------------------------------------------------------------------
    def _call_search(self, plan: IntentPlan, actions: list[AgentAction]):
        t0 = time.perf_counter()
        logger.info("MasterAgent -> SearchAgent")
        result = self.search_agent.run(
            SearchRequest(
                query=(
                    plan.question
                    or f"questions {plan.company or ''} {plan.role or ''} {plan.topic or ''}"
                ).strip(),
                filters=SearchFilters(
                    company=plan.company, role=plan.role, topic=plan.topic
                ),
                strategy="auto",
                caller_agent="master",
            )
        )
        actions.append(
            AgentAction(
                agent_or_tool="search_agent",
                input=plan.model_dump(exclude_none=True),
                output={"found": result.total_found},
                duration_ms=round((time.perf_counter() - t0) * 1000, 1),
                status="success",
            )
        )
        return result

    def _call_content(self, plan: IntentPlan, actions: list[AgentAction]):
        t0 = time.perf_counter()
        logger.info("MasterAgent -> ContentAgent")
        result = self.content_agent.run(
            ContentRequest(
                topic=plan.topic
                or f"{plan.company or ''} {plan.role or ''}".strip()
                or "interview preparation",
                company=plan.company,
                role=plan.role,
                caller_agent="master",
            )
        )
        actions.append(
            AgentAction(
                agent_or_tool="content_agent",
                input=plan.model_dump(exclude_none=True),
                output={"source": result.source},
                duration_ms=round((time.perf_counter() - t0) * 1000, 1),
                status="success",
            )
        )
        return result

    def _call_preparation(self, plan: IntentPlan, actions: list[AgentAction]):
        t0 = time.perf_counter()
        logger.info("MasterAgent -> PreparationAgent")
        result = self.preparation_agent.run(
            PreparationRequest(
                company=plan.company,
                role=plan.role,
                caller_agent="master",
            )
        )
        actions.append(
            AgentAction(
                agent_or_tool="preparation_agent",
                input=plan.model_dump(exclude_none=True),
                output={"rounds": len(result.rounds)},
                duration_ms=round((time.perf_counter() - t0) * 1000, 1),
                status="success",
            )
        )
        return result

    # ------------------------------------------------------------------
    @staticmethod
    def _search_to_text(sr) -> str:
        lines = [f"SEARCH RESULTS ({sr.total_found} questions found):"]
        for q in sr.questions[:15]:
            diff = f", {q.difficulty}" if q.difficulty else ""
            cat = f" [{q.category}]" if q.category else ""
            lines.append(
                f"- {q.canonical_text}{cat} (asked {q.occurrence_count}x{diff})"
            )
        if not sr.questions:
            lines.append("No questions found in the institutional database.")
        return "\n".join(lines)

    @staticmethod
    def _prep_to_text(prep) -> str:
        lines = [f"PREPARATION PLAN for {prep.company or 'target company'} {prep.role or 'role'}:"]
        lines.append(f"Summary: {prep.summary}")
        for r in prep.rounds:
            lines.append(f"\nRound: {r.round_type}")
            lines.append(f"  {r.description}")
            if r.key_topics:
                lines.append(f"  Topics: {', '.join(r.key_topics)}")
            if r.sample_questions:
                lines.append(f"  Sample questions: {'; '.join(r.sample_questions[:3])}")
        if prep.priority_topics:
            lines.append("\nPriority topics:")
            for t in prep.priority_topics[:5]:
                lines.append(f"  {t.priority}. {t.topic} ({t.category}) – {t.question_count} questions")
        if prep.overall_tips:
            lines.append("\nTips: " + "; ".join(prep.overall_tips))
        if prep.schedule_suggestion:
            lines.append(f"\nSchedule: {prep.schedule_suggestion}")
        return "\n".join(lines)

    def _synthesize(self, query: str, agent_text: str) -> str:
        prompt = SYNTHESIS_PROMPT.format(query=query, agent_results=agent_text)
        try:
            return self.llm.generate_text(prompt, temperature=0.3)
        except Exception as exc:
            logger.error("Synthesis failed: %s", exc)
            return agent_text[:2000]

    def _follow_up(self, message: str, session: AgentSession) -> str:
        history = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in session.messages[-6:]
        )
        prompt = (
            f"Conversation history:\n{history}\n\n"
            f"Student follow-up: {message}\n\n"
            f"Answer the follow-up based on the conversation context. Be specific and concise."
        )
        try:
            return self.llm.generate_text(prompt, temperature=0.3)
        except Exception as exc:
            logger.error("Follow-up synthesis failed: %s", exc)
            return "Could you please rephrase your question?"

    # ------------------------------------------------------------------
    def _get_or_create_session(self, session_id: str) -> AgentSession:
        if session_id not in _sessions:
            _sessions[session_id] = AgentSession(session_id=session_id)
        return _sessions[session_id]

    @staticmethod
    def get_session(session_id: str) -> Optional[AgentSession]:
        return _sessions.get(session_id)
