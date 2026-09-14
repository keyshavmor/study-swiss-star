"""Request-scoped Supabase persistence adapter protected by the caller's JWT and RLS."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Iterable
from datetime import UTC, datetime
from threading import RLock
from typing import Any

from .models import (
    ContextArtifact,
    ConversationMessage,
    ConversationSummary,
    DocumentChunk,
    LearningEvent,
    StudentMemory,
)


class SupabaseStoreError(RuntimeError):
    """Raised when Supabase rejects or cannot complete a persistence operation."""


def _iso(value: datetime | None) -> str | None:
    return value.astimezone(UTC).isoformat() if value else None


def _dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


class SupabaseContextStore:
    """Use a publishable key plus one immutable user JWT for all private data access."""

    canonical_transcript = True
    location_scheme = "supabase"

    def __init__(self, url: str, publishable_key: str, access_token: str, user_id: str) -> None:
        if not url or not publishable_key or not access_token or not user_id:
            raise ValueError(
                "Supabase URL, publishable key, access token, and user ID are required"
            )
        if publishable_key.startswith("sb_secret_"):
            raise ValueError("SUPABASE_PUBLISHABLE_KEY must not contain a secret key")
        self.url = url.rstrip("/")
        self.publishable_key = publishable_key
        self.access_token = access_token
        self.user_id = user_id
        self._web_cache: dict[str, tuple[datetime, list[dict[str, Any]]]] = {}
        self._cache_lock = RLock()

    @classmethod
    def from_env(cls, access_token: str, user_id: str) -> SupabaseContextStore:
        """Build a new request-scoped adapter without mutating shared auth state."""

        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
        if not url or not key:
            raise SupabaseStoreError(
                "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for production persistence"
            )
        return cls(url, key, access_token, user_id)

    def close(self) -> None:
        """No persistent connection is held by the HTTP adapter."""

    def _assert_owner(self, student_id: str | None) -> None:
        if student_id != self.user_id:
            raise PermissionError("Requested user does not match the authenticated Supabase user")

    def _request(
        self,
        method: str,
        table: str,
        *,
        query: dict[str, str | int] | None = None,
        body: Any = None,
        prefer: str | None = None,
    ) -> Any:
        encoded = urllib.parse.urlencode(query or {}, safe="(),.*")
        endpoint = f"{self.url}/rest/v1/{table}" + (f"?{encoded}" if encoded else "")
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        headers = {
            "apikey": self.publishable_key,
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }
        if data is not None:
            headers["Content-Type"] = "application/json"
        if prefer:
            headers["Prefer"] = prefer
        request = urllib.request.Request(endpoint, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read()
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise SupabaseStoreError(
                f"Supabase {method} {table} failed with HTTP {error.code}: {detail}"
            ) from error
        except (urllib.error.URLError, TimeoutError) as error:
            raise SupabaseStoreError(f"Supabase {method} {table} is unavailable") from error
        return json.loads(payload) if payload else None

    def _upsert(self, table: str, rows: list[dict[str, Any]]) -> None:
        if rows:
            self._request(
                "POST",
                table,
                query={"on_conflict": "id"},
                body=rows,
                prefer="resolution=merge-duplicates,return=minimal",
            )

    def add_chunks(self, chunks: Iterable[DocumentChunk], *, student_id: str | None = None) -> None:
        self._assert_owner(student_id)
        values = list(chunks)
        documents: dict[str, dict[str, Any]] = {}
        for chunk in values:
            documents.setdefault(
                chunk.document_id,
                {
                    "id": chunk.document_id,
                    "user_id": self.user_id,
                    "subject_slug": chunk.subject,
                    "topic": chunk.topic,
                    "document_type": chunk.document_type or "text",
                    "title": chunk.title,
                    "source": chunk.source,
                    "language": chunk.language,
                    "storage_bucket": "user-materials"
                    if chunk.metadata.get("storage_path")
                    else None,
                    "object_path": chunk.metadata.get("storage_path"),
                    "status": "Indexed",
                    "metadata": chunk.metadata,
                },
            )
        self._upsert("documents", list(documents.values()))
        self._upsert(
            "document_chunks",
            [
                {
                    "id": chunk.id,
                    "document_id": chunk.document_id,
                    "user_id": self.user_id,
                    "content": chunk.content,
                    "title": chunk.title,
                    "subject": chunk.subject,
                    "topic": chunk.topic,
                    "subtopic": chunk.subtopic,
                    "document_type": chunk.document_type,
                    "source": chunk.source,
                    "page": chunk.page,
                    "section": chunk.section,
                    "chapter": chunk.chapter,
                    "language": chunk.language,
                    "token_count": chunk.token_count,
                    "embedding": chunk.embedding,
                    "metadata": chunk.metadata,
                    "created_at": _iso(chunk.created_at),
                }
                for chunk in values
            ],
        )

    def update_chunk_embedding(self, chunk_id: str, embedding: list[float]) -> None:
        self._request(
            "PATCH",
            "document_chunks",
            query={"id": f"eq.{chunk_id}", "user_id": f"eq.{self.user_id}"},
            body={"embedding": embedding},
            prefer="return=minimal",
        )

    def list_chunks(
        self,
        *,
        student_id: str,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 500,
    ) -> list[DocumentChunk]:
        self._assert_owner(student_id)
        query: dict[str, str | int] = {
            "select": "*",
            "user_id": f"eq.{self.user_id}",
            "order": "created_at.desc",
            "limit": limit,
        }
        if subject:
            query["subject"] = f"eq.{subject}"
        if document_types:
            query["document_type"] = f"in.({','.join(sorted(document_types))})"
        if document_ids:
            query["document_id"] = f"in.({','.join(sorted(document_ids))})"
        rows = self._request("GET", "document_chunks", query=query) or []
        return [
            DocumentChunk(
                id=row["id"],
                document_id=row["document_id"],
                content=row["content"],
                title=row["title"],
                subject=row.get("subject"),
                topic=row.get("topic"),
                subtopic=row.get("subtopic"),
                document_type=row.get("document_type"),
                source=row.get("source"),
                page=row.get("page"),
                section=row.get("section"),
                chapter=row.get("chapter"),
                language=row.get("language"),
                created_at=_dt(row.get("created_at")) or datetime.now(UTC),
                token_count=row.get("token_count", 0),
                embedding=row.get("embedding"),
                metadata=row.get("metadata") or {},
            )
            for row in rows
        ]

    def upsert_memory(self, memory: StudentMemory) -> None:
        self._assert_owner(memory.student_id)
        self._upsert(
            "student_memories",
            [
                {
                    "id": memory.id,
                    "user_id": self.user_id,
                    "memory_type": memory.memory_type,
                    "subject": memory.subject,
                    "topic": memory.topic,
                    "content": memory.content,
                    "confidence": memory.confidence,
                    "importance": memory.importance,
                    "evidence": memory.evidence,
                    "evidence_count": memory.evidence_count,
                    "metadata": memory.metadata,
                    "created_at": _iso(memory.created_at),
                    "updated_at": _iso(memory.updated_at),
                    "last_accessed_at": _iso(memory.last_accessed_at),
                }
            ],
        )

    def list_memories(self, student_id: str, *, subject: str | None = None) -> list[StudentMemory]:
        self._assert_owner(student_id)
        query: dict[str, str] = {
            "select": "*",
            "user_id": f"eq.{self.user_id}",
            "order": "importance.desc,updated_at.desc",
        }
        if subject:
            query["or"] = f"(subject.eq.{subject},subject.is.null)"
        rows = self._request("GET", "student_memories", query=query) or []
        return [
            StudentMemory(
                id=row["id"],
                student_id=self.user_id,
                memory_type=row["memory_type"],
                subject=row.get("subject"),
                topic=row.get("topic"),
                content=row["content"],
                confidence=float(row["confidence"]),
                importance=float(row["importance"]),
                evidence=row.get("evidence") or [],
                evidence_count=row.get("evidence_count", 1),
                metadata=row.get("metadata") or {},
                created_at=_dt(row.get("created_at")) or datetime.now(UTC),
                updated_at=_dt(row.get("updated_at")) or datetime.now(UTC),
                last_accessed_at=_dt(row.get("last_accessed_at")),
            )
            for row in rows
        ]

    def add_event(self, event: LearningEvent) -> None:
        self._assert_owner(event.student_id)
        self._upsert(
            "learning_events",
            [
                {
                    "id": event.id,
                    "user_id": self.user_id,
                    "event_type": event.event_type,
                    "subject": event.subject,
                    "topic": event.topic,
                    "content": event.content,
                    "importance": event.importance,
                    "metadata": event.metadata,
                    "occurred_at": _iso(event.occurred_at),
                }
            ],
        )

    def list_events(self, student_id: str, *, subject: str | None = None) -> list[LearningEvent]:
        self._assert_owner(student_id)
        query: dict[str, str] = {
            "select": "*",
            "user_id": f"eq.{self.user_id}",
            "order": "occurred_at.desc",
        }
        if subject:
            query["or"] = f"(subject.eq.{subject},subject.is.null)"
        rows = self._request("GET", "learning_events", query=query) or []
        return [
            LearningEvent(
                id=row["id"],
                student_id=self.user_id,
                event_type=row["event_type"],
                subject=row.get("subject"),
                topic=row.get("topic"),
                content=row["content"],
                importance=float(row["importance"]),
                metadata=row.get("metadata") or {},
                occurred_at=_dt(row.get("occurred_at")) or datetime.now(UTC),
            )
            for row in rows
        ]

    def add_message(self, message: ConversationMessage) -> None:
        self._assert_owner(message.student_id)
        self._upsert(
            "messages",
            [
                {
                    "id": message.id,
                    "thread_id": message.conversation_id,
                    "user_id": self.user_id,
                    "role": message.role,
                    "content": message.content,
                    "token_count": message.token_count,
                    "metadata": message.metadata,
                    "created_at": _iso(message.created_at),
                }
            ],
        )

    def list_messages(self, student_id: str, conversation_id: str) -> list[ConversationMessage]:
        self._assert_owner(student_id)
        rows = (
            self._request(
                "GET",
                "messages",
                query={
                    "select": "id,thread_id,user_id,role,content,token_count,metadata,created_at",
                    "user_id": f"eq.{self.user_id}",
                    "thread_id": f"eq.{conversation_id}",
                    "order": "created_at.asc",
                },
            )
            or []
        )
        return [
            ConversationMessage(
                id=row["id"],
                conversation_id=row["thread_id"],
                student_id=self.user_id,
                role=row["role"],
                content=row["content"],
                token_count=row.get("token_count", 0),
                metadata=row.get("metadata") or {},
                created_at=_dt(row.get("created_at")) or datetime.now(UTC),
            )
            for row in rows
        ]

    def add_summary(self, summary: ConversationSummary) -> None:
        self._assert_owner(summary.student_id)
        self._upsert(
            "conversation_summaries",
            [
                {
                    "id": summary.id,
                    "thread_id": summary.conversation_id,
                    "user_id": self.user_id,
                    "summary": summary.summary,
                    "covered_message_ids": summary.covered_message_ids,
                    "token_count": summary.token_count,
                    "created_at": _iso(summary.created_at),
                }
            ],
        )

    def latest_summary(self, student_id: str, conversation_id: str) -> ConversationSummary | None:
        self._assert_owner(student_id)
        rows = (
            self._request(
                "GET",
                "conversation_summaries",
                query={
                    "select": "*",
                    "user_id": f"eq.{self.user_id}",
                    "thread_id": f"eq.{conversation_id}",
                    "order": "created_at.desc",
                    "limit": 1,
                },
            )
            or []
        )
        if not rows:
            return None
        row = rows[0]
        return ConversationSummary(
            id=row["id"],
            conversation_id=row["thread_id"],
            student_id=self.user_id,
            summary=row["summary"],
            covered_message_ids=row.get("covered_message_ids") or [],
            token_count=row.get("token_count", 0),
            created_at=_dt(row.get("created_at")) or datetime.now(UTC),
        )

    def add_artifact(self, artifact: ContextArtifact, content: str) -> None:
        self._assert_owner(artifact.student_id)
        self._upsert(
            "context_artifacts",
            [
                {
                    "id": artifact.id,
                    "user_id": self.user_id,
                    "artifact_type": artifact.artifact_type,
                    "title": artifact.title,
                    "summary": artifact.summary,
                    "content": content,
                    "content_location": artifact.content_location,
                    "token_count": artifact.token_count,
                    "metadata": artifact.metadata,
                    "searchable": artifact.searchable,
                    "created_at": _iso(artifact.created_at),
                }
            ],
        )

    def list_artifacts(self, student_id: str) -> list[ContextArtifact]:
        self._assert_owner(student_id)
        rows = (
            self._request(
                "GET",
                "context_artifacts",
                query={
                    "select": "*",
                    "user_id": f"eq.{self.user_id}",
                    "searchable": "eq.true",
                    "order": "created_at.desc",
                },
            )
            or []
        )
        return [
            ContextArtifact(
                id=row["id"],
                student_id=self.user_id,
                artifact_type=row["artifact_type"],
                title=row["title"],
                summary=row["summary"],
                content=row["content"],
                content_location=row["content_location"],
                token_count=row.get("token_count", 0),
                metadata=row.get("metadata") or {},
                searchable=row.get("searchable", True),
                created_at=_dt(row.get("created_at")) or datetime.now(UTC),
            )
            for row in rows
        ]

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
    ) -> None:
        self._assert_owner(student_id)
        self._upsert(
            "working_memory",
            [
                {
                    "id": item_id,
                    "user_id": self.user_id,
                    "thread_id": conversation_id,
                    "task_id": task_id,
                    "content": content,
                    "token_count": token_count,
                    "metadata": metadata,
                    "created_at": _iso(created_at),
                    "expires_at": _iso(expires_at),
                }
            ],
        )

    def list_working_memory(
        self, student_id: str, conversation_id: str, *, now: datetime
    ) -> list[dict[str, Any]]:
        self._assert_owner(student_id)
        return (
            self._request(
                "GET",
                "working_memory",
                query={
                    "select": "*",
                    "user_id": f"eq.{self.user_id}",
                    "and": (
                        f"(or(thread_id.eq.{conversation_id},thread_id.is.null),"
                        f"or(expires_at.gt.{_iso(now)},expires_at.is.null))"
                    ),
                    "order": "created_at.desc",
                },
            )
            or []
        )

    def purge_expired_working_memory(self, *, now: datetime) -> int:
        rows = (
            self._request(
                "DELETE",
                "working_memory",
                query={"user_id": f"eq.{self.user_id}", "expires_at": f"lte.{_iso(now)}"},
                prefer="return=representation",
            )
            or []
        )
        return len(rows)

    def get_web_cache(self, query: str, *, now: datetime) -> list[dict[str, Any]] | None:
        with self._cache_lock:
            cached = self._web_cache.get(query)
            return cached[1] if cached and cached[0] > now else None

    def set_web_cache(
        self,
        query: str,
        results: list[dict[str, Any]],
        *,
        fetched_at: datetime,
        expires_at: datetime,
    ) -> None:
        del fetched_at
        with self._cache_lock:
            self._web_cache[query] = (expires_at, results)
