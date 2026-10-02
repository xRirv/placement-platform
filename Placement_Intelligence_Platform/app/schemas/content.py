"""Content-related schema definitions."""

from dataclasses import dataclass, field


@dataclass
class ContentArtifact:
    """Represents a content artifact produced by the content agent."""

    source: str
    body: str = ""
    metadata: dict = field(default_factory=dict)
