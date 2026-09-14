"""Intent-gated local-first retrieval with an automatic internet fallback."""

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
from html.parser import HTMLParser
from pathlib import Path
from typing import Protocol

from .config import WebConfig
from .models import ContextItem, ContextPriority, ContextType
from .store_base import ContextStore
from .text import terms
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


class _TextOnlyHTMLParser(HTMLParser):
    """Extract readable text from locally stored HTML without third-party packages."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._suppressed_depth = 0

    def handle_starttag(self, tag: str, _attrs: list[tuple[str, str | None]]) -> None:
        """Exclude script/style content and separate block-like elements."""

        if tag in {"script", "style"}:
            self._suppressed_depth += 1
        elif self._suppressed_depth == 0 and tag in {"br", "div", "li", "p", "section"}:
            self.parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        """Resume extraction after script/style blocks."""

        if tag in {"script", "style"} and self._suppressed_depth:
            self._suppressed_depth -= 1

    def handle_data(self, data: str) -> None:
        """Retain visible text only."""

        if self._suppressed_depth == 0:
            self.parts.append(data)

    def text(self) -> str:
        """Return whitespace-normalized visible content."""

        return " ".join("".join(self.parts).split())


class LocalCorpusSearchClient:
    """Search an operator-managed offline snapshot under ``material/web``."""

    supported_suffixes = frozenset({".htm", ".html", ".md", ".txt"})
    maximum_file_bytes = 4 * 1024 * 1024
    maximum_files = 512

    def __init__(self, config: WebConfig) -> None:
        """Use the configured cross-platform corpus path and result limits."""

        self.config = config
        self.root = config.local_corpus_path.expanduser()

    async def search(self, query: str, *, limit: int) -> list[WebResult]:
        """Run a small, bounded filesystem scan without any network access."""

        return self._search_sync(query, limit)

    def _search_sync(self, query: str, limit: int) -> list[WebResult]:
        """Rank local text/Markdown/HTML files by deterministic lexical relevance."""

        if not self.root.is_dir() or limit <= 0:
            return []
        query_terms = set(terms(compact_web_query(query)))
        if not query_terms:
            return []
        root = self.root.resolve()
        candidates: list[tuple[int, str, WebResult]] = []
        paths: list[Path] = []
        for index, path in enumerate(root.rglob("*")):
            if index >= self.maximum_files:
                break
            paths.append(path)
        for path in sorted(paths):
            if (
                not path.is_file()
                or path.is_symlink()
                or path.suffix.casefold() not in self.supported_suffixes
            ):
                continue
            try:
                stat = path.stat()
                if stat.st_size <= 0 or stat.st_size > self.maximum_file_bytes:
                    continue
                raw = path.read_text(encoding="utf-8", errors="replace")
                content = self._readable_text(path, raw)
                relative = path.relative_to(root).as_posix()
            except (OSError, ValueError):
                continue
            title = self._title(path, raw)
            searchable = terms(f"{title} {content}")
            score = sum(1 for token in searchable if token in query_terms)
            if score == 0:
                continue
            excerpt = self._excerpt(content, query_terms)
            candidates.append(
                (
                    score,
                    relative,
                    WebResult(
                        title=title,
                        url=f"local://{relative}",
                        content=excerpt,
                        provider="Local corpus",
                        fetched_at=datetime.fromtimestamp(stat.st_mtime, UTC).isoformat(),
                    ),
                )
            )
        candidates.sort(key=lambda item: (-item[0], item[1]))
        return [result for _, _, result in candidates[: min(limit, self.config.max_results)]]

    @staticmethod
    def _readable_text(path: Path, raw: str) -> str:
        """Convert supported local formats into plain text."""

        if path.suffix.casefold() not in {".htm", ".html"}:
            return " ".join(raw.split())
        parser = _TextOnlyHTMLParser()
        parser.feed(raw)
        parser.close()
        return parser.text()

    @staticmethod
    def _title(path: Path, raw: str) -> str:
        """Prefer a Markdown heading and otherwise derive a stable filename title."""

        if path.suffix.casefold() == ".md":
            for line in raw.splitlines():
                heading = line.lstrip().removeprefix("#").strip()
                if line.lstrip().startswith("#") and heading:
                    return heading
        return path.stem.replace("-", " ").replace("_", " ").strip() or path.name

    def _excerpt(self, content: str, query_terms: set[str]) -> str:
        """Return a bounded passage centered near the first matching term."""

        folded = content.casefold()
        positions = [folded.find(term) for term in query_terms if folded.find(term) >= 0]
        first = min(positions, default=0)
        allowance = self.config.max_chars_per_result
        start = max(0, first - allowance // 4)
        excerpt = content[start : start + allowance]
        return excerpt.strip()


class WikipediaSearchClient:
    """Internet adapter using MediaWiki search and article extracts."""

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


class LocalFirstSearchClient:
    """Use local material when relevant, otherwise fetch a current web reference."""

    def __init__(self, config: WebConfig) -> None:
        """Construct both providers without performing filesystem or network I/O."""

        self.local = LocalCorpusSearchClient(config)
        self.remote = WikipediaSearchClient(config)

    async def search(self, query: str, *, limit: int) -> list[WebResult]:
        """Return local matches, falling back to the internet only when none exist."""

        local_results = await self.local.search(query, limit=limit)
        if local_results:
            return local_results
        return await self.remote.search(query, limit=limit)


def create_web_search_client(config: WebConfig) -> WebSearchClient:
    """Select automatic local-first, local-only, or internet-only retrieval."""

    if config.provider == "auto":
        return LocalFirstSearchClient(config)
    if config.provider == "local":
        return LocalCorpusSearchClient(config)
    if config.provider == "wikipedia":
        return WikipediaSearchClient(config)
    raise ValueError(
        f"Unsupported ALIM_WEB_PROVIDER={config.provider!r}; "
        "expected 'auto', 'local', or 'wikipedia'"
    )


class CachedWebRetriever:
    """Reuse fresh web results and convert them into budgetable context items."""

    def __init__(
        self,
        store: ContextStore,
        counter: TokenCounter,
        config: WebConfig,
        client: WebSearchClient | None = None,
    ) -> None:
        """Configure cached retrieval and its optional provider implementation."""

        self.store = store
        self.counter = counter
        self.config = config
        self.client = client or create_web_search_client(config)

    async def retrieve(self, query: str) -> tuple[list[ContextItem], bool]:
        """Return provenance-labelled context plus whether the local cache was hit."""

        normalized = " ".join(query.casefold().split())
        cache_key = f"{self.config.provider}:{normalized}"
        now = datetime.now(UTC)
        cached = self.store.get_web_cache(cache_key, now=now)
        cache_hit = cached is not None
        if cached is None:
            results = await self.client.search(query, limit=self.config.max_results)
            cached = [asdict(result) for result in results]
            self.store.set_web_cache(
                cache_key,
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
