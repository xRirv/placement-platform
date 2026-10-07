"""Master agent tests."""
import pytest

from app.agents.master.agent import MasterAgent, _sessions
from app.agents.master.schemas import IntentPlan, MasterRequest, MasterResponse
from app.agents.master.router import MasterRouter


def test_master_agent_instantiation():
    agent = MasterAgent()
    assert agent is not None
    assert agent.ALLOWED_DELEGATES == {"search", "content", "preparation"}


def test_master_router_regex_fallback_preparation():
    router = MasterRouter()
    plan = router._regex_classify("Prepare me for Infosys SDE interview", None)
    assert plan.primary_intent in ("preparation", "multi")
    assert plan.needs_preparation is True


def test_master_router_regex_fallback_search():
    router = MasterRouter()
    plan = router._regex_classify("What questions were asked at TCS?", None)
    assert plan.primary_intent in ("search", "multi")
    assert plan.needs_search is True


def test_master_router_regex_fallback_content():
    router = MasterRouter()
    plan = router._regex_classify("Explain dynamic programming", None)
    assert plan.primary_intent in ("content", "multi")
    assert plan.needs_content is True


def test_master_session_created_on_first_run(monkeypatch):
    from app.agents.master.agent import MasterAgent
    from app.agents.master.schemas import IntentPlan

    def fake_classify(self, msg, ctx):
        return IntentPlan(
            primary_intent="search",
            needs_search=True,
            needs_content=False,
            needs_preparation=False,
            reasoning="test",
        )

    from app.agents.search.agent import SearchAgent
    from app.schemas.search import SearchResult

    def fake_search(self, req):
        return SearchResult(query=req.query, strategy_used="sql", total_found=0)

    monkeypatch.setattr(MasterRouter, "classify_intent", fake_classify)
    monkeypatch.setattr(SearchAgent, "run", fake_search)

    session_id = "test-session-xyz"
    _sessions.pop(session_id, None)

    agent = MasterAgent()
    req = MasterRequest(message="questions at Wipro", session_id=session_id)
    resp = agent.run(req)

    assert isinstance(resp, MasterResponse)
    assert resp.session_id == session_id
    assert session_id in _sessions


def test_get_session_returns_none_for_unknown():
    result = MasterAgent.get_session("nonexistent-session-id-12345")
    assert result is None


def test_get_session_returns_session_after_run(monkeypatch):
    from app.agents.master.schemas import IntentPlan
    from app.agents.search.agent import SearchAgent
    from app.schemas.search import SearchResult

    def fake_classify(self, msg, ctx):
        return IntentPlan(
            primary_intent="search",
            needs_search=True,
            needs_content=False,
            needs_preparation=False,
            reasoning="test",
        )

    def fake_search(self, req):
        return SearchResult(query=req.query, strategy_used="sql", total_found=0)

    monkeypatch.setattr(MasterRouter, "classify_intent", fake_classify)
    monkeypatch.setattr(SearchAgent, "run", fake_search)

    session_id = "test-session-get-abc"
    _sessions.pop(session_id, None)

    agent = MasterAgent()
    agent.run(MasterRequest(message="questions at HCL", session_id=session_id))

    session = MasterAgent.get_session(session_id)
    assert session is not None
    assert session.session_id == session_id
    assert len(session.messages) >= 1
