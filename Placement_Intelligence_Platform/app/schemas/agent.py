"""Common agent-related schema definitions."""

from dataclasses import dataclass


@dataclass
class AgentMessage:
    """Basic message contract for agent interactions."""

    role: str
    content: str
