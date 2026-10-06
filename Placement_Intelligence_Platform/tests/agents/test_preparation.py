"""Preparation agent tests."""
import pytest

from app.agents.preparation.agent import PreparationAgent
from app.agents.preparation.planner import PreparationPlanner, PreparationPlan
from app.schemas.preparation import PreparationRequest
from app.schemas.search import SearchResult


def test_preparation_agent_instantiation():
    agent = PreparationAgent()
    assert agent is not None
    assert "search" in agent.ALLOWED_DELEGATES
    assert "content" in agent.ALLOWED_DELEGATES


def test_planner_needs_content_when_no_questions():
    planner = PreparationPlanner()
    empty_result = SearchResult(query="test", strategy_used="sql", total_found=0)
    plan = planner.plan("Infosys", "SDE", empty_result)
    assert isinstance(plan, PreparationPlan)
    assert plan.needs_content is True
    assert plan.has_sufficient_data is False


def test_planner_sufficient_when_many_questions():
    from app.schemas.search import QuestionResult
    planner = PreparationPlanner()
    questions = [
        QuestionResult(question_id=f"q{i}", canonical_text=f"Question {i}", category="DSA")
        for i in range(10)
    ]
    result = SearchResult(query="test", strategy_used="sql", total_found=10, questions=questions)
    plan = planner.plan("Amazon", "SDE", result)
    assert isinstance(plan, PreparationPlan)
    assert plan.has_sufficient_data is True


def test_planner_identifies_topics_from_questions():
    from app.schemas.search import QuestionResult
    planner = PreparationPlanner()
    questions = [
        QuestionResult(question_id="q1", canonical_text="Q1", topic="Arrays", category="DSA"),
        QuestionResult(question_id="q2", canonical_text="Q2", topic="Trees", category="DSA"),
        QuestionResult(question_id="q3", canonical_text="Q3", topic="Arrays", category="DSA"),
    ]
    result = SearchResult(query="test", strategy_used="sql", total_found=3, questions=questions)
    plan = planner.plan("Google", "SWE", result)
    assert "Arrays" in plan.identified_topics


def test_preparation_request_schema():
    req = PreparationRequest(
        company="Microsoft",
        role="SDE-2",
        message="Prepare me for my interview",
    )
    assert req.company == "Microsoft"
    assert req.role == "SDE-2"
    assert req.message == "Prepare me for my interview"
