"""Content agent tests."""
import pytest

from app.agents.content.agent import ContentAgent
from app.agents.content.planner import ContentPlanner, ContentPlan
from app.schemas.content import ContentRequest, ContentResult


def test_content_agent_instantiation():
    agent = ContentAgent()
    assert agent is not None
    assert agent.ALLOWED_DELEGATES == set()


def test_content_agent_has_no_sibling_agents():
    agent = ContentAgent()
    assert not hasattr(agent, "search_agent")
    assert not hasattr(agent, "preparation_agent")
    assert not hasattr(agent, "master_agent")


def test_content_planner_prefers_db():
    planner = ContentPlanner()
    plan = planner.plan("Dynamic Programming", "Google", "institutional_first")
    assert isinstance(plan, ContentPlan)
    assert plan.check_institutional is True


def test_content_planner_web_disabled_for_institutional_only():
    planner = ContentPlanner()
    plan = planner.plan("System Design", None, "institutional_only")
    assert plan.check_web is False


def test_content_agent_returns_result_gracefully(monkeypatch):
    """ContentAgent returns a ContentResult even when DB and web are empty."""
    from app.tools.search.question import QuestionSearchTool
    from app.tools.search.topic import TopicSearchTool

    monkeypatch.setattr(QuestionSearchTool, "search_by_filters", lambda self, **kw: [])
    monkeypatch.setattr(TopicSearchTool, "get_top_topics", lambda self, **kw: [])

    agent = ContentAgent()
    req = ContentRequest(topic="Graphs", company="Infosys", role="SDE")
    result = agent.run(req)
    assert isinstance(result, ContentResult)
    assert result.topic == "Graphs"


def test_content_result_schema():
    r = ContentResult(topic="Arrays", summary="Arrays summary")
    assert r.topic == "Arrays"
    assert r.items == []
    assert r.summary == "Arrays summary"


def test_content_request_defaults():
    r = ContentRequest(topic="Sorting")
    assert r.topic == "Sorting"
    assert r.company is None
    assert r.role is None
