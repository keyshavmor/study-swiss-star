"""Persistence contract shared by the Supabase production and SQLite test adapters."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime
from typing import Any, Protocol

from .models import (
    ContextArtifact,
    ConversationMessage,
    ConversationSummary,
    DocumentChunk,
    LearningEvent,
    StudentMemory,
)


class ContextStore(Protocol):
    """Operations used by context algorithms, independent of their database."""

    canonical_transcript: bool
    location_scheme: str

    def add_chunks(
        self, chunks: Iterable[DocumentChunk], *, student_id: str | None = None
    ) -> None: ...

    def update_chunk_embedding(self, chunk_id: str, embedding: list[float]) -> None: ...

    def list_chunks(
        self,
        *,
        student_id: str,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 500,
    ) -> list[DocumentChunk]: ...

    def upsert_memory(self, memory: StudentMemory) -> None: ...

    def list_memories(
        self, student_id: str, *, subject: str | None = None
    ) -> list[StudentMemory]: ...

    def add_event(self, event: LearningEvent) -> None: ...

    def list_events(
        self, student_id: str, *, subject: str | None = None
    ) -> list[LearningEvent]: ...

    def add_message(self, message: ConversationMessage) -> None: ...

    def list_messages(self, student_id: str, conversation_id: str) -> list[ConversationMessage]: ...

    def add_summary(self, summary: ConversationSummary) -> None: ...

    def latest_summary(
        self, student_id: str, conversation_id: str
    ) -> ConversationSummary | None: ...

    def add_artifact(self, artifact: ContextArtifact, content: str) -> None: ...

    def list_artifacts(self, student_id: str) -> list[ContextArtifact]: ...

    def add_working_memory(
        self,
        *,
        item_id: str,
        student_id: str,
        conversation_id: str | None,
        task_id: str | None,
        content: str,
        token_count: int,
        metadata: dict[str, Any],
        created_at: datetime,
        expires_at: datetime | None,
    ) -> None: ...

    def list_working_memory(
        self, student_id: str, conversation_id: str, *, now: datetime
    ) -> list[dict[str, Any]]: ...

    def purge_expired_working_memory(self, *, now: datetime) -> int: ...

    def get_web_cache(self, query: str, *, now: datetime) -> list[dict[str, Any]] | None: ...

    def set_web_cache(
        self,
        query: str,
        results: list[dict[str, Any]],
        *,
        fetched_at: datetime,
        expires_at: datetime,
    ) -> None: ...
