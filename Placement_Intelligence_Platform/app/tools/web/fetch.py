"""Web page fetch tool."""
from __future__ import annotations

import logging
import urllib.error
import urllib.request

logger = logging.getLogger("tool.web_fetch")


class WebFetchTool:
    def fetch(self, url: str, timeout: int = 10) -> dict:
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "PlacementIntelligence/1.0"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                content = resp.read().decode("utf-8", errors="replace")
            return {"url": url, "content": content, "status": 200, "error": None}
        except urllib.error.HTTPError as exc:
            logger.warning("HTTP %s fetching %s", exc.code, url)
            return {"url": url, "content": "", "status": exc.code, "error": str(exc)}
        except Exception as exc:
            logger.warning("Fetch failed %s: %s", url, exc)
            return {"url": url, "content": "", "status": 0, "error": str(exc)}
