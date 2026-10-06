"""Preparation Agent – second-level supervisor.

Can call SearchAgent and ContentAgent. Cannot call MasterAgent or itself.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Optional

from app.agents.content.agent import ContentAgent
from app.agents.preparation.planner import PreparationPlan, PreparationPlanner
from app.agents.search.agent import SearchAgent
from app.schemas.agent import AgentAction
from app.schemas.content import ContentRequest, ContentResult
from app.schemas.preparation import (
    PreparationRequest,
    PreparationResult,
    PreparationRound,
    TopicPriority,
)
from app.schemas.search import SearchFilters, SearchRequest, SearchResult
from app.services.llm import get_llm

logger = logging.getLogger("agents.preparation")


class PreparationAgent:
    """Preparation supervisor. Calls Search then conditionally Content."""

    ALLOWED_DELEGATES: set = {"search", "content"}

    def __init__(self) -> None:
        self.search_agent = SearchAgent()
        self.content_agent = ContentAgent()
        self.planner = PreparationPlanner()
        self.llm = get_llm()

    def run(self, request: PreparationRequest) -> PreparationResult:
        logger.info(
            "PreparationAgent company=%s role=%s", request.company, request.role
        )
        actions: list[AgentAction] = []

        # Step 1 — Search institutional data
        t0 = time.perf_counter()
        logger.info("PreparationAgent -> SearchAgent")
        search_result = self._call_search(request)
        ms = round((time.perf_counter() - t0) * 1000, 1)
        actions.append(
            AgentAction(
                agent_or_tool="search_agent",
                input={"company": request.company, "role": request.role},
                output={"questions_found": search_result.total_found},
                duration_ms=ms,
                status="success",
            )
        )

        # Step 2 — Decide if Content is needed
        plan = self.planner.plan(request.company, request.role, search_result)
        logger.info("PreparationPlanner needs_content=%s", plan.needs_content)

        content_results: list[ContentResult] = []
        if plan.needs_content:
            for topic in plan.content_topics[:2]:
                logger.info("PreparationAgent -> ContentAgent topic=%s", topic)
                t0 = time.perf_counter()
                try:
                    cr = self.content_agent.run(
                        ContentRequest(
                            topic=topic,
                            company=request.company,
                            role=request.role,
                            source_preference="institutional_first",
                            caller_agent="preparation",
                        )
                    )
                    content_results.append(cr)
                    actions.append(
                        AgentAction(
                            agent_or_tool="content_agent",
                            input={"topic": topic},
                            output={"source": cr.source, "items": len(cr.items)},
                            duration_ms=round((time.perf_counter() - t0) * 1000, 1),
                            status="success",
                        )
                    )
                except Exception as exc:
                    logger.warning("ContentAgent call failed: %s", exc)
                    actions.append(
                        AgentAction(
                            agent_or_tool="content_agent",
                            input={"topic": topic},
                            output={"error": str(exc)},
                            status="error",
                        )
                    )

        # Step 3 — Synthesize plan
        return self._synthesize(request, search_result, content_results, plan, actions)

    # ------------------------------------------------------------------
    def _call_search(self, request: PreparationRequest) -> SearchResult:
        try:
            return self.search_agent.run(
                SearchRequest(
                    query=(
                        f"interview questions {request.company or ''} {request.role or ''}"
                    ).strip(),
                    filters=SearchFilters(
                        company=request.company, role=request.role
                    ),
                    strategy="sql",
                    limit=30,
                    caller_agent="preparation",
                )
            )
        except Exception as exc:
            logger.error("Search call failed: %s", exc)
            from app.schemas.search import SearchResult
            return SearchResult(query="", strategy_used="sql", total_found=0)

    def _synthesize(
        self,
        request: PreparationRequest,
        search_result: SearchResult,
        content_results: list[ContentResult],
        plan: PreparationPlan,
        actions: list[AgentAction],
    ) -> PreparationResult:
        company = request.company or "the target company"
        role = request.role or "the target role"

        q_lines = "\n".join(
            f"- [{q.category or 'GENERAL'}] {q.canonical_text} "
            f"(asked {q.occurrence_count}x, {q.difficulty or 'unknown difficulty'})"
            for q in search_result.questions[:20]
        )
        ctx_lines = "\n\n".join(
            f"--- {cr.topic} ---\n{cr.summary or ''}" for cr in content_results
        )

        prompt = f"""You are a placement preparation expert for engineering students in India.

Company: {company}
Role: {role}
Days available for preparation: {request.days_available or 'not specified'}

Institutional interview data ({search_result.total_found} questions from our database):
{q_lines if q_lines else 'No specific questions in database yet.'}

Additional context:
{ctx_lines if ctx_lines else 'No additional context.'}

Create a structured preparation plan as JSON:
{{
  "rounds": [
    {{
      "round_type": "ONLINE_ASSESSMENT/TECHNICAL/HR/SYSTEM_DESIGN",
      "ordinal": 1,
      "description": "brief description",
      "key_topics": ["topic1", "topic2"],
      "sample_questions": ["question 1", "question 2"],
      "preparation_tips": ["tip 1", "tip 2"]
    }}
  ],
  "priority_topics": [
    {{
      "topic": "Arrays",
      "category": "DSA",
      "priority": 1,
      "question_count": 5,
      "sample_questions": ["Two Sum", "Reverse array"]
    }}
  ],
  "overall_tips": ["tip 1", "tip 2", "tip 3"],
  "schedule_suggestion": "Week 1: DSA basics; Week 2: Practice problems; ...",
  "summary": "2-3 sentence overview of the preparation strategy"
}}

Base your rounds and topics on the actual questions found. Provide realistic and specific advice."""

        try:
            raw = self.llm.generate_text(prompt, temperature=0.2)
            m = re.search(r"\{.*\}", raw, re.S)
            data = json.loads(m.group()) if m else {}

            rounds = [
                PreparationRound(
                    round_type=r.get("round_type", "GENERAL"),
                    ordinal=r.get("ordinal"),
                    description=r.get("description", ""),
                    key_topics=r.get("key_topics", []),
                    sample_questions=r.get("sample_questions", []),
                    preparation_tips=r.get("preparation_tips", []),
                )
                for r in data.get("rounds", [])
            ]
            priority_topics = [
                TopicPriority(
                    topic=t.get("topic", ""),
                    category=t.get("category", "GENERAL"),
                    priority=t.get("priority", 1),
                    question_count=t.get("question_count", 0),
                    sample_questions=t.get("sample_questions", []),
                )
                for t in data.get("priority_topics", [])
            ]

            evidence_source = "institutional" if search_result.total_found > 0 else "synthesized"
            if content_results:
                evidence_source = "mixed" if search_result.total_found > 0 else "web_synthesis"

            return PreparationResult(
                company=request.company,
                role=request.role,
                rounds=rounds,
                priority_topics=priority_topics,
                preparation_phases=[],
                schedule_suggestion=data.get("schedule_suggestion"),
                overall_tips=data.get("overall_tips", []),
                summary=data.get("summary", ""),
                evidence_source=evidence_source,
                metadata={
                    "search_questions_found": search_result.total_found,
                    "content_sources": len(content_results),
                    "actions": [a.model_dump() for a in actions],
                },
            )

        except Exception as exc:
            logger.error("Preparation synthesis failed: %s", exc)
            return PreparationResult(
                company=request.company,
                role=request.role,
                rounds=[
                    PreparationRound(
                        round_type="GENERAL",
                        description=f"Prepare for {company} {role} interview",
                        key_topics=plan.identified_topics[:5],
                        sample_questions=[
                            q.canonical_text for q in search_result.questions[:5]
                        ],
                        preparation_tips=[
                            "Practice DSA daily",
                            "Review system design concepts",
                            "Prepare STAR-format behavioural answers",
                        ],
                    )
                ],
                priority_topics=[],
                overall_tips=[
                    "Focus on fundamentals",
                    "Practice mock interviews",
                    "Review company-specific content",
                ],
                summary=(
                    f"Prepare for {company} {role} interview with focus on "
                    f"{', '.join(plan.identified_topics[:3]) or 'core CS fundamentals'}."
                ),
                evidence_source="fallback",
                metadata={
                    "error": str(exc),
                    "search_questions_found": search_result.total_found,
                },
            )
