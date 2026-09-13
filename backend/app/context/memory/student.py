"""Evidence-controlled durable student memory and relevance retrieval."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from typing import Any

from ..config import MemoryConfig
from ..models import ContextItem, ContextPriority, ContextType, StudentMemory
from ..store import SQLiteContextStore
from ..text import lexical_overlap, normalize_text
from ..tokenization import TokenCounter

ALLOWED_MEMORY_TYPES = {
    "strength",
    "weakness",
    "misconception",
    "mastery",
    "learning_preference",
    "language_preference",
    "educational_goal",
    "study_commitment",
    "teacher_feedback",
}


class StudentMemoryManager:
    """Store only explicit or repeated learner facts and retrieve them selectively."""

    def __init__(
        self, store: SQLiteContextStore, counter: TokenCounter, config: MemoryConfig
    ) -> None:
        """Configure durable learner-memory extraction thresholds."""

        self.store = store
        self.counter = counter
        self.config = config

    def retrieve(
        self,
        student_id: str,
        query: str,
        *,
        subject: str | None,
        topics: list[str],
        limit: int,
    ) -> list[ContextItem]:
        """Rank eligible memories without exposing private internal evidence metadata."""

        memories = self.store.list_memories(student_id, subject=subject)
        topic_set = {topic.casefold() for topic in topics}
        scored: list[ContextItem] = []
        for memory in memories:
            semantic = lexical_overlap(query, memory.content)
            subject_match = float(bool(subject and memory.subject == subject))
            topic_match = float(bool(memory.topic and memory.topic.casefold() in topic_set))
            score = (
                0.3 * semantic
                + 0.2 * subject_match
                + 0.15 * topic_match
                + 0.2 * memory.importance
                + 0.15 * memory.confidence
            )
            if score < 0.1:
                continue
            scored.append(
                ContextItem(
                    id=memory.id,
                    type=ContextType.STUDENT_MEMORY,
                    content=memory.content,
                    subject=memory.subject,
                    topic=memory.topic,
                    relevance_score=score,
                    importance_score=memory.importance,
                    confidence=memory.confidence,
                    token_count=self.counter.count(memory.content),
                    metadata={
                        "memory_type": memory.memory_type,
                        "evidence_count": memory.evidence_count,
                        "updated_at": memory.updated_at.isoformat(),
                    },
                    priority=(
                        ContextPriority.P1
                        if memory.memory_type == "misconception" and memory.importance >= 0.7
                        else ContextPriority.P2
                    ),
                )
            )
        return sorted(scored, key=lambda item: (-item.relevance_score, item.id))[:limit]

    def process_interaction(
        self,
        *,
        student_id: str,
        user_message: str,
        subject: str | None,
        topic: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> list[StudentMemory]:
        """Persist only explicit preferences/goals or evidence-backed supplied candidates."""
        metadata = metadata or {}
        candidates = list(metadata.get("memory_candidates", []))
        explicit = self._explicit_candidate(user_message)
        if explicit:
            candidates.append(explicit)

        saved: list[StudentMemory] = []
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            memory_type = str(candidate.get("memory_type", ""))
            content = str(candidate.get("content", "")).strip()
            confidence = float(candidate.get("confidence", 0.0))
            importance = float(candidate.get("importance", 0.0))
            evidence = [str(value) for value in candidate.get("evidence", []) if str(value).strip()]
            evidence_count = int(candidate.get("evidence_count", len(evidence) or 1))
            if (
                memory_type not in ALLOWED_MEMORY_TYPES
                or not content
                or confidence < self.config.minimum_confidence
                or importance < self.config.minimum_importance
            ):
                continue
            if (
                memory_type in {"mastery", "misconception", "weakness"}
                and evidence_count < self.config.mastery_evidence_threshold
            ):
                continue
            memory_subject = candidate.get("subject", subject)
            memory_topic = candidate.get("topic", topic)
            memory_id = str(
                uuid.uuid5(
                    uuid.NAMESPACE_URL,
                    "|".join(
                        [
                            student_id,
                            memory_type,
                            str(memory_subject or ""),
                            str(memory_topic or ""),
                            normalize_text(content),
                        ]
                    ),
                )
            )
            now = datetime.now(UTC)
            memory = StudentMemory(
                id=memory_id,
                student_id=student_id,
                memory_type=memory_type,
                subject=str(memory_subject) if memory_subject else None,
                topic=str(memory_topic) if memory_topic else None,
                content=content,
                confidence=min(1.0, confidence),
                importance=min(1.0, importance),
                evidence=evidence,
                evidence_count=evidence_count,
                created_at=now,
                updated_at=now,
                metadata={"writer": "controlled_interaction_policy"},
            )
            self.store.upsert_memory(memory)
            saved.append(memory)
        return saved

    @staticmethod
    def _explicit_candidate(message: str) -> dict[str, Any] | None:
        """Extract an explicitly stated preference or learner fact when safe."""

        patterns = [
            (
                r"\b(?:my goal is|i want to achieve|mein ziel ist|mon objectif est)\s+(.+)",
                "educational_goal",
            ),
            (r"\b(?:i prefer|ich bevorzuge|je préfère)\s+(.+)", "learning_preference"),
        ]
        for pattern, memory_type in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return {
                    "memory_type": memory_type,
                    "content": match.group(0).strip(),
                    "confidence": 0.95,
                    "importance": 0.65,
                    "evidence": ["Explicitly stated by the student"],
                    "evidence_count": 1,
                }
        return None
