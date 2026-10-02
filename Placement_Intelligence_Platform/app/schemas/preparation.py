"""Preparation-related schema definitions."""

from dataclasses import dataclass, field


@dataclass
class PreparationArtifact:
    """Represents a prepared artifact for downstream processing."""

    item: str
    status: str = "pending"
    details: dict = field(default_factory=dict)
