"""Search agent tests."""
import pytest

from app.agents.search.agent import SearchAgent
from app.agents.search.planner import SearchPlanner
from app.schemas.search import SearchFilters, SearchRequest, SearchResult


def test_search_agent_instantiation():
    agent = SearchAgent()
    assert agent is not None
    assert agent.ALLOWED_DELEGATES == set()


def test_search_filters_defaults():
    f = SearchFilters()
    assert f.company is None
    assert f.role is None


def test_search_filters_with_values():
    f = SearchFilters(company="Infosys", role="SDE", category="DSA")
    assert f.company == "Infosys"
    assert f.role == "SDE"
    assert f.category == "DSA"


def test_search_request_defaults():
    r = SearchRequest(query="test query")
    assert r.query == "test query"
    assert r.strategy == "auto"
    assert r.limit == 20


def test_search_planner_sql_for_structured():
    planner = SearchPlanner()
    req = SearchRequest(
        query="questions at Amazon for SDE",
        filters=SearchFilters(company="Amazon", role="SDE"),
    )
    plan = planner.plan(req)
    assert plan.use_sql is True
    assert plan.strategy == "sql"


def test_search_planner_enriches_filters_from_query():
    planner = SearchPlanner()
    req = SearchRequest(query="questions asked at Microsoft for software engineer")
    plan = planner.plan(req)
    # Company extracted from query
    assert plan.enriched_filters is not None


def test_search_agent_returns_empty_gracefully(monkeypatch):
    """SearchAgent returns empty SearchResult when DB has no data."""
    from app.tools.search.question import QuestionSearchTool
    monkeypatch.setattr(QuestionSearchTool, "search_by_filters", lambda self, **kw: [])
    monkeypatch.setattr(QuestionSearchTool, "search_by_text", lambda self, t, limit=20: [])

    agent = SearchAgent()
    result = agent.run(SearchRequest(query="questions at XYZ company nobody heard of"))
    assert isinstance(result, SearchResult)
    assert result.total_found == 0
    assert result.questions == []


def test_search_result_structure():
    r = SearchResult(query="test", strategy_used="sql")
    assert r.questions == []
    assert r.total_found == 0
    assert r.evidence == []
