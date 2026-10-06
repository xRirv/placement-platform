"""Preparation supervisor planner – decides what information is needed."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from app.schemas.search import SearchResult

logger = logging.getLogger("agents.preparation.planner")


@dataclass
class PreparationPlan:
    needs_content: bool = False
    content_topics: list[str] = field(default_factory=list)
    identified_topics: list[str] = field(default_factory=list)
    has_sufficient_data: bool = False
    reasoning: str = ""


class PreparationPlanner:
    MIN_QUESTIONS = 3

    def plan(
        self,
        company: Optional[str],
        role: Optional[str],
        search_result: Optional[SearchResult] = None,
    ) -> PreparationPlan:
        if search_result is None or search_result.total_found == 0:
            topics: list[str] = []
            if company:
                topics.append(f"{company} interview process and rounds")
            if role:
                topics.append(f"{role} interview preparation tips")
            if company and role:
                topics.append(f"{company} {role} required skills")
            return PreparationPlan(
                needs_content=True,
                content_topics=topics or ["general interview preparation"],
                has_sufficient_data=False,
                reasoning="No institutional data; delegating to Content for context.",
            )

        q_count = search_result.total_found
        categories = {q.category for q in search_result.questions if q.category}
        topics_found = list({q.topic for q in search_result.questions if q.topic})

        sufficient = q_count >= self.MIN_QUESTIONS
        needs_content = not sufficient or len(categories) == 0

        content_topics: list[str] = []
        if not sufficient and company:
            content_topics.append(f"{company} interview process")
        if not categories and company and role:
            content_topics.append(f"{company} {role} technical expectations")

        return PreparationPlan(
            needs_content=needs_content,
            content_topics=content_topics,
            identified_topics=topics_found[:10],
            has_sufficient_data=sufficient,
            reasoning=(
                f"Found {q_count} questions, {len(categories)} categories. "
                f"Sufficient: {sufficient}."
            ),
        )
