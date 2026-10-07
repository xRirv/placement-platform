"""Search Agent – institutional knowledge retrieval specialist.

This agent CANNOT call other agents. It only uses search tools.
"""
from __future__ import annotations

import logging
import time

from app.agents.search.planner import SearchPlanner
from app.schemas.agent import AgentAction
from app.schemas.search import QuestionResult, SearchRequest, SearchResult
from app.tools.search.experience import ExperienceSearchTool
from app.tools.search.question import QuestionSearchTool
from app.tools.search.topic import TopicSearchTool
from app.tools.search.vector import VectorSearchTool

logger = logging.getLogger("agents.search")


class SearchAgent:
    """Specialist agent for institutional knowledge retrieval.

    ALLOWED_DELEGATES is empty: Search never calls other agents.
    """

    ALLOWED_DELEGATES: set = set()

    def __init__(self) -> None:
        self.question_tool = QuestionSearchTool()
        self.experience_tool = ExperienceSearchTool()
        self.topic_tool = TopicSearchTool()
        self.vector_tool = VectorSearchTool()
        self.planner = SearchPlanner()

    def run(self, request: SearchRequest) -> SearchResult:
        logger.info(
            "SearchAgent started query=%s strategy=%s",
            request.query[:80],
            request.strategy,
        )
        actions: list[AgentAction] = []
        evidence: list[dict] = []
        raw_questions: list[dict] = []

        plan = self.planner.plan(request)
        logger.info(
            "SearchAgent plan strategy=%s filters=%s",
            plan.strategy,
            plan.enriched_filters.model_dump(exclude_none=True),
        )

        # --- SQL retrieval ---
        if plan.use_sql:
            t0 = time.perf_counter()
            sql_qs = self._sql_search(plan.enriched_filters, request.limit)
            ms = round((time.perf_counter() - t0) * 1000, 1)
            actions.append(
                AgentAction(
                    agent_or_tool="question_search_sql",
                    input=plan.enriched_filters.model_dump(exclude_none=True),
                    output={"count": len(sql_qs)},
                    duration_ms=ms,
                    status="success",
                )
            )
            raw_questions.extend(sql_qs)
            if sql_qs:
                evidence.append({"source": "database_sql", "count": len(sql_qs)})

        # --- Vector retrieval (skip – embedder not wired) ---
        if plan.use_vector and self.vector_tool.is_available():
            logger.info("SearchAgent: vector search not yet wired (no embedding step)")

        # --- Text fallback when SQL returned nothing ---
        if not raw_questions and request.query:
            t0 = time.perf_counter()
            text_qs = self._text_search(request.query, request.limit)
            ms = round((time.perf_counter() - t0) * 1000, 1)
            actions.append(
                AgentAction(
                    agent_or_tool="question_search_text",
                    input={"query": request.query},
                    output={"count": len(text_qs)},
                    duration_ms=ms,
                    status="success",
                )
            )
            raw_questions.extend(text_qs)
            if text_qs:
                evidence.append({"source": "database_text", "count": len(text_qs)})

        # Deduplicate and build QuestionResult objects
        seen: set[str] = set()
        unique: list[QuestionResult] = []
        for q in raw_questions:
            qid = q.get("question_id") or q.get("id", "")
            if qid and qid in seen:
                continue
            if qid:
                seen.add(qid)
            # companies / roles come from question_with_context view;
            # fall back to [] when querying the base table before migration.
            companies = q.get("companies") or []
            roles = q.get("roles") or []
            if isinstance(companies, str):
                companies = [companies]
            if isinstance(roles, str):
                roles = [roles]
            unique.append(
                QuestionResult(
                    question_id=qid or q.get("canonical_text", "")[:40],
                    canonical_text=q.get("canonical_text") or q.get("asked_text", ""),
                    category=q.get("category"),
                    topic=q.get("topic"),
                    difficulty=q.get("difficulty"),
                    occurrence_count=q.get("occurrence_count", 1),
                    companies=companies,
                    roles=roles,
                )
            )

        unique.sort(key=lambda q: q.occurrence_count, reverse=True)
        result = SearchResult(
            query=request.query,
            strategy_used=plan.strategy,
            questions=unique[: request.limit],
            total_found=len(unique),
            evidence=evidence,
            metadata={
                "plan_reasoning": plan.reasoning,
                "filters_used": plan.enriched_filters.model_dump(exclude_none=True),
            },
        )
        logger.info("SearchAgent completed found=%d", result.total_found)
        return result

    # ------------------------------------------------------------------
    def _sql_search(self, filters, limit: int) -> list[dict]:
        try:
            return self.question_tool.search_by_filters(
                company=filters.company,
                role=filters.role,
                topic=filters.topic,
                category=filters.category,
                difficulty=filters.difficulty,
                limit=limit,
            )
        except Exception as exc:
            logger.error("SQL search error: %s", exc)
            return []

    def _text_search(self, query: str, limit: int) -> list[dict]:
        try:
            return self.question_tool.search_by_text(query, limit=limit)
        except Exception as exc:
            logger.error("Text search error: %s", exc)
            return []
