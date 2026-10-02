"""Search-related schema definitions."""

from dataclasses import dataclass, field


@dataclass
class SearchResult:
    """Represents a search hit."""

    query: str
    results: list = field(default_factory=list)
