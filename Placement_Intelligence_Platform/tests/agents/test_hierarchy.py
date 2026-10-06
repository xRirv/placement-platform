"""Hierarchy enforcement tests.

These tests verify the ALLOWED_DELEGATES contract that prevents illegal
agent-to-agent calls (e.g. Search calling Content, Preparation calling Master).
"""
import pytest


def test_search_agent_has_no_delegates():
    from app.agents.search.agent import SearchAgent
    assert SearchAgent.ALLOWED_DELEGATES == set()


def test_content_agent_has_no_delegates():
    from app.agents.content.agent import ContentAgent
    assert ContentAgent.ALLOWED_DELEGATES == set()


def test_preparation_delegates_include_search_and_content():
    from app.agents.preparation.agent import PreparationAgent
    assert "search" in PreparationAgent.ALLOWED_DELEGATES
    assert "content" in PreparationAgent.ALLOWED_DELEGATES


def test_preparation_cannot_delegate_to_master():
    from app.agents.preparation.agent import PreparationAgent
    assert "master" not in PreparationAgent.ALLOWED_DELEGATES


def test_preparation_cannot_delegate_to_itself():
    from app.agents.preparation.agent import PreparationAgent
    assert "preparation" not in PreparationAgent.ALLOWED_DELEGATES


def test_master_delegates_include_all_three():
    from app.agents.master.agent import MasterAgent
    assert MasterAgent.ALLOWED_DELEGATES == {"search", "content", "preparation"}


def test_preparation_contains_search_agent():
    from app.agents.preparation.agent import PreparationAgent
    from app.agents.search.agent import SearchAgent
    prep = PreparationAgent()
    assert isinstance(prep.search_agent, SearchAgent)


def test_preparation_contains_content_agent():
    from app.agents.preparation.agent import PreparationAgent
    from app.agents.content.agent import ContentAgent
    prep = PreparationAgent()
    assert isinstance(prep.content_agent, ContentAgent)


def test_master_contains_all_child_agents():
    from app.agents.master.agent import MasterAgent
    from app.agents.search.agent import SearchAgent
    from app.agents.content.agent import ContentAgent
    from app.agents.preparation.agent import PreparationAgent
    m = MasterAgent()
    assert isinstance(m.search_agent, SearchAgent)
    assert isinstance(m.content_agent, ContentAgent)
    assert isinstance(m.preparation_agent, PreparationAgent)


def test_search_agent_has_no_child_agent_attributes():
    """SearchAgent must not hold references to other agents."""
    from app.agents.search.agent import SearchAgent
    agent = SearchAgent()
    assert not hasattr(agent, "master_agent")
    assert not hasattr(agent, "preparation_agent")
    assert not hasattr(agent, "content_agent")


def test_content_agent_has_no_child_agent_attributes():
    from app.agents.content.agent import ContentAgent
    agent = ContentAgent()
    assert not hasattr(agent, "master_agent")
    assert not hasattr(agent, "preparation_agent")
    assert not hasattr(agent, "search_agent")
