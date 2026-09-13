"""Timestamped learning-event recording and relevance retrieval."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from ..models import ContextItem, ContextPriority, ContextType, LearningEvent
from ..store import SQLiteContextStore
from ..text import lexical_overlap
from ..tokenization import TokenCounter

ALLOWED_EVENT_TYPES = {
    "quiz_result",
    "exam_result",
    "mistake",
    "mastery_update",
    "study_session",
    "teacher_feedback",
    "important_conversation",
    "learning_milestone",
}


class EpisodicMemoryManager:
    """Manage assessments and activities used in progress-aware tutoring."""

    def __init__(self, store: SQLiteContextStore, counter: TokenCounter) -> None:
        """Configure the event store and token counter."""

        self.store = store
        self.counter = counter

    def record(
        self,
        *,
        student_id: str,
        event_type: str,
        content: str,
        subject: str | None = None,
        topic: str | None = None,
        occurred_at: datetime | None = None,
        importance: float = 0.5,
        metadata: dict[str, Any] | None = None,
        event_id: str | None = None,
    ) -> LearningEvent:
        """Normalize and persist one learning event."""

        if event_type not in ALLOWED_EVENT_TYPES:
            raise ValueError(f"Unsupported learning event type: {event_type}")
        if not content.strip():
            raise ValueError("Learning event content cannot be empty")
        event = LearningEvent(
            id=event_id or str(uuid.uuid4()),
            student_id=student_id,
            event_type=event_type,
            content=content.strip(),
            subject=subject,
            topic=topic,
            occurred_at=occurred_at or datetime.now(UTC),
            importance=max(0.0, min(1.0, importance)),
            metadata=metadata or {},
        )
        self.store.add_event(event)
        return event

    def retrieve(
        self,
        student_id: str,
        query: str,
        *,
        subject: str | None,
        topics: list[str],
        limit: int,
    ) -> list[ContextItem]:
        """Rank past events by subject, topic, wording, importance, and recency."""

        events = self.store.list_events(student_id, subject=subject)
        topic_set = {topic.casefold() for topic in topics}
        now = datetime.now(UTC)
        result: list[ContextItem] = []
        for event in events:
            age_days = max(0, (now - event.occurred_at).days)
            recency = 1 / (1 + age_days / 60)
            score = (
                0.35 * lexical_overlap(query, event.content)
                + 0.2 * float(bool(subject and event.subject == subject))
                + 0.15 * float(bool(event.topic and event.topic.casefold() in topic_set))
                + 0.15 * event.importance
                + 0.15 * recency
            )
            if score < 0.1:
                continue
            result.append(
                ContextItem(
                    id=event.id,
                    type=ContextType.EPISODE,
                    content=f"{event.occurred_at.date().isoformat()}: {event.content}",
                    subject=event.subject,
                    topic=event.topic,
                    relevance_score=score,
                    importance_score=event.importance,
                    token_count=self.counter.count(event.content) + 4,
                    metadata={
                        "event_type": event.event_type,
                        "occurred_at": event.occurred_at.isoformat(),
                    }
                    | event.metadata,
                    priority=ContextPriority.P2,
                )
            )
        return sorted(result, key=lambda item: (-item.relevance_score, item.id))[:limit]
