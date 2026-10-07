"""Content Agent – contextual information retrieval and synthesis.

This agent CANNOT call other agents. It uses web tools and the LLM service.
"""
from __future__ import annotations

import logging

from app.agents.content.planner import ContentPlanner
from app.core.config import settings
from app.db.agent_repository import get_agent_repository
from app.schemas.content import ContentItem, ContentRequest, ContentResult
from app.services.llm import get_llm
from app.tools.cache.content import ContentCacheHelper
from app.tools.web.extract import ContentExtractTool
from app.tools.web.fetch import WebFetchTool
from app.tools.web.search import WebSearchTool
from app.tools.web.validate import ContentValidateTool

logger = logging.getLogger("agents.content")


class ContentAgent:
    """Contextual information synthesis. Does NOT call other agents."""

    ALLOWED_DELEGATES: set = set()

    def __init__(self) -> None:
        self.planner = ContentPlanner()
        self.web_search = WebSearchTool()
        self.web_fetch = WebFetchTool()
        self.extractor = ContentExtractTool()
        self.validator = ContentValidateTool()
        self.cache = ContentCacheHelper()
        self.llm = get_llm()
        self._repo = get_agent_repository()

    def run(self, request: ContentRequest) -> ContentResult:
        logger.info("ContentAgent topic=%s company=%s", request.topic, request.company)

        cached = self.cache.get(request.topic, request.company)
        if cached:
            cached.metadata["from_cache"] = True
            return cached

        plan = self.planner.plan(request.topic, request.company, request.source_preference)
        items: list[ContentItem] = []
        source = "llm_synthesis"

        if plan.check_institutional:
            inst = self._institutional(request)
            items.extend(inst)
            if inst:
                source = "database"

        if plan.check_web and settings.web_search_enabled and len(items) < 2:
            web = self._web(request)
            items.extend(web)
            if web:
                source = "web" if source == "llm_synthesis" else "mixed"

        summary = self._synthesize(request, items)
        if not items:
            items.append(
                ContentItem(
                    title=f"Overview: {request.topic}",
                    content=summary,
                    source="llm_synthesis",
                    confidence=0.6,
                )
            )

        result = ContentResult(
            topic=request.topic,
            items=items,
            summary=summary,
            source=source,
            metadata={"company": request.company, "role": request.role},
        )
        self.cache.set(request.topic, result, request.company)
        return result

    # ------------------------------------------------------------------
    def _institutional(self, request: ContentRequest) -> list[ContentItem]:
        out: list[ContentItem] = []
        try:
            if request.company:
                # companies table via AgentRepository
                rows = self._repo.find_companies_by_normalized_name(
                    request.company.lower(), limit=3
                )
                for r in rows:
                    out.append(
                        ContentItem(
                            title=f"Company: {r['name']}",
                            content=(
                                f"'{r['name']}' is tracked in the placement "
                                f"intelligence database."
                            ),
                            source="database",
                            confidence=1.0,
                        )
                    )
            if request.topic:
                # topics table via AgentRepository
                topic_rows = self._repo.search_topics_by_name(
                    request.topic, limit=5
                )
                for t in topic_rows:
                    out.append(
                        ContentItem(
                            title=f"Topic: {t.get('topic','')} ({t.get('category','')})",
                            content=(
                                f"The topic '{t.get('topic','')}' falls under "
                                f"'{t.get('category','')}' in the question bank."
                            ),
                            source="database",
                            confidence=0.9,
                        )
                    )
                # Also pull sample questions for this topic via question_with_context
                sample_qs = self._repo.get_questions_by_ids(
                    [], topic=request.topic, limit=5
                )
                for q in sample_qs[:5]:
                    out.append(
                        ContentItem(
                            title=f"Sample question: {q.get('canonical_text','')[:80]}",
                            content=q.get("canonical_text", ""),
                            source="database",
                            confidence=0.85,
                        )
                    )
        except Exception as exc:
            logger.warning("Institutional content query failed: %s", exc)
        return out

    def _web(self, request: ContentRequest) -> list[ContentItem]:
        out: list[ContentItem] = []
        try:
            query = f"{request.company or ''} {request.topic} interview process".strip()
            for r in self.web_search.search(query, limit=3):
                if not r.get("url"):
                    continue
                fetched = self.web_fetch.fetch(r["url"])
                if fetched["content"]:
                    text = self.extractor.extract(fetched["content"])
                    if self.validator.validate(text, request.topic):
                        out.append(
                            ContentItem(
                                title=r.get("title", r["url"]),
                                content=text[:2000],
                                source="web",
                                url=r["url"],
                                confidence=0.7,
                            )
                        )
        except Exception as exc:
            logger.warning("Web content query failed: %s", exc)
        return out

    def _synthesize(self, request: ContentRequest, items: list[ContentItem]) -> str:
        ctx = "\n\n".join(f"Source: {it.source}\n{it.content[:800]}" for it in items[:3])
        company_part = f" at {request.company}" if request.company else ""
        prompt = (
            f"You are providing information about '{request.topic}'{company_part} "
            f"for placement interview preparation.\n\n"
            f"Available context:\n{ctx or 'No specific context available.'}\n\n"
            f"Write a concise 2-3 paragraph overview of '{request.topic}'{company_part}. "
            f"Focus on what is relevant for interview preparation. "
            f"If context is limited, provide accurate general information and note it is general knowledge."
        )
        try:
            return self.llm.generate_text(prompt, temperature=0.3)
        except Exception as exc:
            logger.warning("LLM synthesis failed: %s", exc)
            return f"Information about {request.topic} is available in the platform."
