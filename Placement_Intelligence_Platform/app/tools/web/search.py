"""Web search via DuckDuckGo instant-answers JSON API (no API key required)."""
from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request

logger = logging.getLogger("tool.web_search")
_DDG = "https://api.duckduckgo.com/?q={q}&format=json&no_html=1&skip_disambig=1"


class WebSearchTool:
    def search(self, query: str, limit: int = 5) -> list[dict]:
        try:
            url = _DDG.format(q=urllib.parse.quote_plus(query))
            req = urllib.request.Request(
                url, headers={"User-Agent": "PlacementIntelligence/1.0"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            results: list[dict] = []
            for item in (data.get("RelatedTopics") or []):
                if not isinstance(item, dict):
                    continue
                text = item.get("Text", "")
                url_ = item.get("FirstURL", "")
                if text:
                    results.append({"title": text[:120], "url": url_, "snippet": text})
                if len(results) >= limit:
                    break
            return results
        except Exception as exc:
            logger.warning("Web search failed '%s': %s", query, exc)
            return []
