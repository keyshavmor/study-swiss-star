"""Final deterministic reranking informed by intent and student topics."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol

from ..models import ContextItem, QueryContext
from ..text import lexical_overlap


class Reranker(Protocol):
    """Refine candidate order after hybrid retrieval."""

    async def rerank(
        self,
        query: str,
        candidates: list[ContextItem],
        limit: int,
        *,
        query_context: QueryContext | None = None,
        student_topics: set[str] | None = None,
    ) -> list[ContextItem]:
        """Return candidates reordered and truncated to ``limit``."""

        ...


class HeuristicReranker:
    """Boost query overlap, topic alignment, and exam-source relevance."""

    """Cheap first-pass reranker; callers can replace it with a local cross-encoder."""

    async def rerank(
        self,
        query: str,
        candidates: list[ContextItem],
        limit: int,
        *,
        query_context: QueryContext | None = None,
        student_topics: set[str] | None = None,
    ) -> list[ContextItem]:
        """Score candidates and return at most ``limit`` items."""

        now = datetime.now(UTC)
        student_topics = {topic.casefold() for topic in (student_topics or set())}
        for item in candidates:
            lexical = lexical_overlap(query, item.content)
            subject_match = float(
                bool(
                    query_context
                    and query_context.subject
                    and item.subject == query_context.subject
                )
            )
            topic_match = float(
                bool(
                    item.topic
                    and query_context
                    and item.topic.casefold()
                    in {topic.casefold() for topic in query_context.topics}
                )
            )
            syllabus = float(
                item.type.value == "syllabus" or item.metadata.get("document_type") == "syllabus"
            )
            learning_state = float(bool(item.topic and item.topic.casefold() in student_topics))
            source_quality = float(item.metadata.get("source_quality", 0.5))
            recency = 0.5
            created = item.metadata.get("created_at")
            if isinstance(created, str):
                try:
                    age_days = max(0, (now - datetime.fromisoformat(created)).days)
                    recency = 1 / (1 + age_days / 365)
                except ValueError:
                    pass
            score = (
                0.42 * item.relevance_score
                + 0.2 * lexical
                + 0.1 * subject_match
                + 0.08 * topic_match
                + 0.06 * syllabus
                + 0.05 * learning_state
                + 0.05 * source_quality
                + 0.04 * recency
            )
            item.metadata["rerank_score"] = score
            item.relevance_score = min(1.0, score)
        return sorted(candidates, key=lambda item: (-item.relevance_score, item.id))[:limit]
