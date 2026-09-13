"""Intent-gated, cached web retrieval with explicit untrusted-source provenance."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from .config import WebConfig
from .models import ContextItem, ContextPriority, ContextType
from .store import SQLiteContextStore
from .tokenization import TokenCounter

WEB_QUERY_FILLER_WORDS = frozenset(
    {
        "about",
        "and",
        "are",
        "briefly",
        "browse",
        "current",
        "educational",
        "explain",
        "for",
        "in",
        "internet",
        "is",
        "look",
        "me",
        "of",
        "one",
        "online",
        "please",
        "role",
        "search",
        "sentence",
        "sentences",
        "summarize",
        "tell",
        "the",
        "two",
        "up",
        "web",
        "what",
    }
)


def compact_web_query(query: str) -> str:
    """Strip conversational instructions so the provider receives topical terms.

    A user might write "browse the internet and explain ...". Passing the whole
    sentence to MediaWiki can prioritize pages containing those generic words,
    whereas the remaining named entities provide a much better search query.
    """

    words = re.findall(r"[^\W_]+(?:['’-][^\W_]+)?", query, flags=re.UNICODE)
    topical = [word for word in words if word.casefold() not in WEB_QUERY_FILLER_WORDS]
    return " ".join(topical[:16]) or query


class WebRetrievalError(RuntimeError):
    """Raised for recoverable provider/network failures."""


@dataclass(slots=True, frozen=True)
class WebResult:
    """Provider-neutral web result stored in the local cache."""

    title: str
    url: str
    content: str
    provider: str
    fetched_at: str


class WebSearchClient(Protocol):
    """Interface for pluggable web search providers."""

    async def search(self, query: str, *, limit: int) -> list[WebResult]:
        """Fetch at most ``limit`` current results for the query."""

        ...


class WikipediaSearchClient:
    """Zero-key internet adapter using MediaWiki search and article extracts."""

    endpoint = "https://en.wikipedia.org/w/api.php"

    def __init__(self, config: WebConfig) -> None:
        """Configure MediaWiki result limits, timeouts, and user agent."""

        self.config = config

    async def search(self, query: str, *, limit: int) -> list[WebResult]:
        """Run blocking MediaWiki I/O outside the async event loop."""

        return await asyncio.to_thread(self._search_sync, query, limit)

    def _search_sync(self, query: str, limit: int) -> list[WebResult]:
        """Fetch and normalize article introductions from MediaWiki."""

        search_query = compact_web_query(query)
        parameters = urllib.parse.urlencode(
            {
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": search_query,
                "gsrlimit": min(limit, self.config.max_results),
                "prop": "extracts|info",
                "explaintext": "1",
                "exintro": "1",
                "inprop": "url",
                "redirects": "1",
            }
        )
        request = urllib.request.Request(
            f"{self.endpoint}?{parameters}",
            method="GET",
            headers={"User-Agent": self.config.user_agent, "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
            pages = payload.get("query", {}).get("pages", {}).values()
            fetched_at = datetime.now(UTC).isoformat()
            values = [
                WebResult(
                    title=str(page.get("title", "Wikipedia")),
                    url=str(page.get("fullurl", "https://en.wikipedia.org")),
                    content=str(page.get("extract", ""))[: self.config.max_chars_per_result],
                    provider="Wikipedia",
                    fetched_at=fetched_at,
                )
                for page in pages
                if page.get("extract")
            ]
            return values[:limit]
        except (
            urllib.error.URLError,
            TimeoutError,
            json.JSONDecodeError,
            AttributeError,
            TypeError,
        ) as error:
            raise WebRetrievalError("Internet retrieval is temporarily unavailable") from error


class CachedWebRetriever:
    """Reuse fresh web results and convert them into budgetable context items."""

    def __init__(
        self,
        store: SQLiteContextStore,
        counter: TokenCounter,
        config: WebConfig,
        client: WebSearchClient | None = None,
    ) -> None:
        """Configure cached retrieval and its optional provider implementation."""

        self.store = store
        self.counter = counter
        self.config = config
        self.client = client or WikipediaSearchClient(config)

    async def retrieve(self, query: str) -> tuple[list[ContextItem], bool]:
        """Return provenance-labelled context plus whether the local cache was hit."""

        normalized = " ".join(query.casefold().split())
        now = datetime.now(UTC)
        cached = self.store.get_web_cache(normalized, now=now)
        cache_hit = cached is not None
        if cached is None:
            results = await self.client.search(query, limit=self.config.max_results)
            cached = [asdict(result) for result in results]
            self.store.set_web_cache(
                normalized,
                cached,
                fetched_at=now,
                expires_at=now + timedelta(minutes=self.config.cache_ttl_minutes),
            )
        items = []
        for result in cached:
            content = str(result["content"])
            url = str(result["url"])
            digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:20]
            items.append(
                ContextItem(
                    id=f"web_{digest}",
                    type=ContextType.WEB,
                    content=content,
                    source=url,
                    relevance_score=0.65,
                    importance_score=0.45,
                    token_count=self.counter.count(content),
                    priority=ContextPriority.P2,
                    metadata={
                        "title": result["title"],
                        "url": url,
                        "provider": result["provider"],
                        "fetched_at": result["fetched_at"],
                        "untrusted_external_content": True,
                    },
                )
            )
        return items, cache_hit
