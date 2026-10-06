"""Basic content extraction from HTML."""
from __future__ import annotations

import re

_SCRIPT_STYLE = re.compile(r"<(?:script|style)[^>]*>.*?</(?:script|style)>", re.S | re.I)
_TAGS = re.compile(r"<[^>]+>")
_SPACE = re.compile(r"\s{3,}")


class ContentExtractTool:
    def extract(self, html: str, max_chars: int = 4000) -> str:
        text = _SCRIPT_STYLE.sub(" ", html)
        text = _TAGS.sub(" ", text)
        text = _SPACE.sub("\n", text).strip()
        return text[:max_chars]
