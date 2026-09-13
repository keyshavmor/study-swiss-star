from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
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


def _iso(value: datetime | None) -> str | None:
    return value.astimezone(UTC).isoformat() if value else None


def _dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


class SQLiteContextStore:
    """Local-first structured store. Original messages and artifact bodies are never discarded."""

    def __init__(self, path: str | Path = ":memory:") -> None:
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(self.path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._lock = RLock()
        self._migrate()

    def close(self) -> None:
        self._connection.close()

    def _migrate(self) -> None:
        with self._lock, self._connection:
            self._connection.executescript(
                """
                PRAGMA foreign_keys = ON;
                CREATE TABLE IF NOT EXISTS context_schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    student_id TEXT,
                    subject TEXT,
                    topic TEXT,
                    document_type TEXT,
                    title TEXT NOT NULL,
                    source TEXT,
                    language TEXT,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    title TEXT NOT NULL,
                    subject TEXT,
                    topic TEXT,
                    subtopic TEXT,
                    document_type TEXT,
                    source TEXT,
                    page INTEGER,
                    section TEXT,
                    chapter TEXT,
                    language TEXT,
                    token_count INTEGER NOT NULL,
                    embedding TEXT,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS document_chunks_scope_idx
                    ON document_chunks(subject, topic, document_type);
                CREATE INDEX IF NOT EXISTS document_chunks_document_idx
                    ON document_chunks(document_id);

                CREATE TABLE IF NOT EXISTS student_memories (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    subject TEXT,
                    topic TEXT,
                    content TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    importance REAL NOT NULL,
                    evidence TEXT NOT NULL DEFAULT '[]',
                    evidence_count INTEGER NOT NULL DEFAULT 1,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_accessed_at TEXT
                );
                CREATE INDEX IF NOT EXISTS student_memories_lookup_idx
                    ON student_memories(student_id, subject, topic, memory_type, updated_at DESC);

                CREATE TABLE IF NOT EXISTS learning_events (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    subject TEXT,
                    topic TEXT,
                    content TEXT NOT NULL,
                    importance REAL NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    occurred_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS learning_events_lookup_idx
                    ON learning_events(student_id, subject, topic, event_type, occurred_at DESC);

                CREATE TABLE IF NOT EXISTS conversation_messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    token_count INTEGER NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS conversation_messages_lookup_idx
                    ON conversation_messages(student_id, conversation_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS conversation_summaries (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    student_id TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    covered_message_ids TEXT NOT NULL,
                    token_count INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS conversation_summaries_lookup_idx
                    ON conversation_summaries(student_id, conversation_id, created_at DESC);

                CREATE TABLE IF NOT EXISTS context_artifacts (
                    id TEXT PRIMARY KEY,
                    student_id TEXT,
                    artifact_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    content TEXT NOT NULL,
                    content_location TEXT NOT NULL,
                    token_count INTEGER NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    searchable INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS context_artifacts_lookup_idx
                    ON context_artifacts(student_id, artifact_type, created_at DESC);

                CREATE TABLE IF NOT EXISTS working_memory (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    conversation_id TEXT,
                    task_id TEXT,
                    content TEXT NOT NULL,
                    token_count INTEGER NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    expires_at TEXT
                );
                CREATE INDEX IF NOT EXISTS working_memory_lookup_idx
                    ON working_memory(student_id, conversation_id, task_id, expires_at);
                """
            )
            self._connection.execute(
                "INSERT OR IGNORE INTO context_schema_version(version, applied_at) VALUES(1, ?)",
                (_iso(datetime.now(UTC)),),
            )

    def add_chunks(self, chunks: Iterable[DocumentChunk], *, student_id: str | None = None) -> None:
        with self._lock, self._connection:
            for chunk in chunks:
                self._connection.execute(
                    """INSERT INTO documents
                    (id, student_id, subject, topic, document_type, title, source, language, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET subject=excluded.subject, topic=excluded.topic,
                    document_type=excluded.document_type, title=excluded.title, source=excluded.source,
                    language=excluded.language, metadata=excluded.metadata""",
                    (
                        chunk.document_id,
                        student_id,
                        chunk.subject,
                        chunk.topic,
                        chunk.document_type,
                        chunk.title,
                        chunk.source,
                        chunk.language,
                        _json(chunk.metadata),
                        _iso(chunk.created_at),
                    ),
                )
                self._connection.execute(
                    """INSERT INTO document_chunks
                    (id, document_id, content, title, subject, topic, subtopic, document_type,
                     source, page, section, chapter, language, token_count, embedding, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET content=excluded.content, token_count=excluded.token_count,
                    embedding=excluded.embedding, metadata=excluded.metadata""",
                    (
                        chunk.id,
                        chunk.document_id,
                        chunk.content,
                        chunk.title,
                        chunk.subject,
                        chunk.topic,
                        chunk.subtopic,
                        chunk.document_type,
                        chunk.source,
                        chunk.page,
                        chunk.section,
                        chunk.chapter,
                        chunk.language,
                        chunk.token_count,
                        _json(chunk.embedding) if chunk.embedding is not None else None,
                        _json(chunk.metadata),
                        _iso(chunk.created_at),
                    ),
                )

    def update_chunk_embedding(self, chunk_id: str, embedding: list[float]) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                "UPDATE document_chunks SET embedding=? WHERE id=?", (_json(embedding), chunk_id)
            )

    def list_chunks(
        self,
        *,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 500,
    ) -> list[DocumentChunk]:
        clauses: list[str] = []
        values: list[Any] = []
        if subject:
            clauses.append("subject = ?")
            values.append(subject)
        if document_types:
            marks = ",".join("?" for _ in document_types)
            clauses.append(f"document_type IN ({marks})")
            values.extend(sorted(document_types))
        if document_ids:
            marks = ",".join("?" for _ in document_ids)
            clauses.append(f"document_id IN ({marks})")
            values.extend(sorted(document_ids))
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = self._connection.execute(
            f"SELECT * FROM document_chunks {where} ORDER BY created_at DESC LIMIT ?",
            (*values, limit),
        ).fetchall()
        return [self._chunk(row) for row in rows]

    @staticmethod
    def _chunk(row: sqlite3.Row) -> DocumentChunk:
        return DocumentChunk(
            id=row["id"],
            document_id=row["document_id"],
            content=row["content"],
            title=row["title"],
            subject=row["subject"],
            topic=row["topic"],
            subtopic=row["subtopic"],
            document_type=row["document_type"],
            source=row["source"],
            page=row["page"],
            section=row["section"],
            chapter=row["chapter"],
            language=row["language"],
            created_at=_dt(row["created_at"]) or datetime.now(UTC),
            token_count=row["token_count"],
            embedding=json.loads(row["embedding"]) if row["embedding"] else None,
            metadata=json.loads(row["metadata"]),
        )

    def upsert_memory(self, memory: StudentMemory) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT INTO student_memories
                (id, student_id, memory_type, subject, topic, content, confidence, importance,
                 evidence, evidence_count, metadata, created_at, updated_at, last_accessed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET content=excluded.content, confidence=excluded.confidence,
                importance=excluded.importance, evidence=excluded.evidence,
                evidence_count=excluded.evidence_count, metadata=excluded.metadata,
                updated_at=excluded.updated_at""",
                (
                    memory.id,
                    memory.student_id,
                    memory.memory_type,
                    memory.subject,
                    memory.topic,
                    memory.content,
                    memory.confidence,
                    memory.importance,
                    _json(memory.evidence),
                    memory.evidence_count,
                    _json(memory.metadata),
                    _iso(memory.created_at),
                    _iso(memory.updated_at),
                    _iso(memory.last_accessed_at),
                ),
            )

    def list_memories(self, student_id: str, *, subject: str | None = None) -> list[StudentMemory]:
        query = "SELECT * FROM student_memories WHERE student_id=?"
        values: list[Any] = [student_id]
        if subject:
            query += " AND (subject=? OR subject IS NULL)"
            values.append(subject)
        query += " ORDER BY importance DESC, updated_at DESC"
        rows = self._connection.execute(query, values).fetchall()
        return [
            StudentMemory(
                id=row["id"],
                student_id=row["student_id"],
                memory_type=row["memory_type"],
                subject=row["subject"],
                topic=row["topic"],
                content=row["content"],
                confidence=row["confidence"],
                importance=row["importance"],
                evidence=json.loads(row["evidence"]),
                evidence_count=row["evidence_count"],
                metadata=json.loads(row["metadata"]),
                created_at=_dt(row["created_at"]) or datetime.now(UTC),
                updated_at=_dt(row["updated_at"]) or datetime.now(UTC),
                last_accessed_at=_dt(row["last_accessed_at"]),
            )
            for row in rows
        ]

    def add_event(self, event: LearningEvent) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT OR REPLACE INTO learning_events
                (id, student_id, event_type, subject, topic, content, importance, metadata, occurred_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    event.id,
                    event.student_id,
                    event.event_type,
                    event.subject,
                    event.topic,
                    event.content,
                    event.importance,
                    _json(event.metadata),
                    _iso(event.occurred_at),
                ),
            )

    def list_events(self, student_id: str, *, subject: str | None = None) -> list[LearningEvent]:
        query = "SELECT * FROM learning_events WHERE student_id=?"
        values: list[Any] = [student_id]
        if subject:
            query += " AND (subject=? OR subject IS NULL)"
            values.append(subject)
        query += " ORDER BY occurred_at DESC"
        rows = self._connection.execute(query, values).fetchall()
        return [
            LearningEvent(
                id=row["id"],
                student_id=row["student_id"],
                event_type=row["event_type"],
                subject=row["subject"],
                topic=row["topic"],
                content=row["content"],
                importance=row["importance"],
                metadata=json.loads(row["metadata"]),
                occurred_at=_dt(row["occurred_at"]) or datetime.now(UTC),
            )
            for row in rows
        ]

    def add_message(self, message: ConversationMessage) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT OR IGNORE INTO conversation_messages
                (id, conversation_id, student_id, role, content, token_count, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    message.id,
                    message.conversation_id,
                    message.student_id,
                    message.role,
                    message.content,
                    message.token_count,
                    _json(message.metadata),
                    _iso(message.created_at),
                ),
            )

    def list_messages(self, student_id: str, conversation_id: str) -> list[ConversationMessage]:
        rows = self._connection.execute(
            """SELECT * FROM conversation_messages
            WHERE student_id=? AND conversation_id=? ORDER BY created_at ASC, rowid ASC""",
            (student_id, conversation_id),
        ).fetchall()
        return [
            ConversationMessage(
                id=row["id"],
                conversation_id=row["conversation_id"],
                student_id=row["student_id"],
                role=row["role"],
                content=row["content"],
                token_count=row["token_count"],
                metadata=json.loads(row["metadata"]),
                created_at=_dt(row["created_at"]) or datetime.now(UTC),
            )
            for row in rows
        ]

    def add_summary(self, summary: ConversationSummary) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT INTO conversation_summaries
                (id, conversation_id, student_id, summary, covered_message_ids, token_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    summary.id,
                    summary.conversation_id,
                    summary.student_id,
                    summary.summary,
                    _json(summary.covered_message_ids),
                    summary.token_count,
                    _iso(summary.created_at),
                ),
            )

    def latest_summary(self, student_id: str, conversation_id: str) -> ConversationSummary | None:
        row = self._connection.execute(
            """SELECT * FROM conversation_summaries
            WHERE student_id=? AND conversation_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1""",
            (student_id, conversation_id),
        ).fetchone()
        if not row:
            return None
        return ConversationSummary(
            id=row["id"],
            conversation_id=row["conversation_id"],
            student_id=row["student_id"],
            summary=row["summary"],
            covered_message_ids=json.loads(row["covered_message_ids"]),
            token_count=row["token_count"],
            created_at=_dt(row["created_at"]) or datetime.now(UTC),
        )

    def add_artifact(self, artifact: ContextArtifact, content: str) -> None:
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT OR REPLACE INTO context_artifacts
                (id, student_id, artifact_type, title, summary, content, content_location,
                 token_count, metadata, searchable, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    artifact.id,
                    artifact.student_id,
                    artifact.artifact_type,
                    artifact.title,
                    artifact.summary,
                    content,
                    artifact.content_location,
                    artifact.token_count,
                    _json(artifact.metadata),
                    int(artifact.searchable),
                    _iso(artifact.created_at),
                ),
            )

    def list_artifacts(self, student_id: str) -> list[ContextArtifact]:
        rows = self._connection.execute(
            """SELECT * FROM context_artifacts
            WHERE (student_id=? OR student_id IS NULL) AND searchable=1 ORDER BY created_at DESC""",
            (student_id,),
        ).fetchall()
        return [
            ContextArtifact(
                id=row["id"],
                student_id=row["student_id"],
                artifact_type=row["artifact_type"],
                title=row["title"],
                summary=row["summary"],
                content=row["content"],
                content_location=row["content_location"],
                token_count=row["token_count"],
                metadata=json.loads(row["metadata"]),
                searchable=bool(row["searchable"]),
                created_at=_dt(row["created_at"]) or datetime.now(UTC),
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
        with self._lock, self._connection:
            self._connection.execute(
                """INSERT OR REPLACE INTO working_memory
                (id, student_id, conversation_id, task_id, content, token_count, metadata, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item_id,
                    student_id,
                    conversation_id,
                    task_id,
                    content,
                    token_count,
                    _json(metadata),
                    _iso(created_at),
                    _iso(expires_at),
                ),
            )

    def list_working_memory(
        self, student_id: str, conversation_id: str, *, now: datetime
    ) -> list[dict[str, Any]]:
        rows = self._connection.execute(
            """SELECT * FROM working_memory WHERE student_id=?
            AND (conversation_id=? OR conversation_id IS NULL)
            AND (expires_at IS NULL OR expires_at>?) ORDER BY created_at DESC""",
            (student_id, conversation_id, _iso(now)),
        ).fetchall()
        return [dict(row) | {"metadata": json.loads(row["metadata"])} for row in rows]

    def purge_expired_working_memory(self, *, now: datetime) -> int:
        with self._lock, self._connection:
            cursor = self._connection.execute(
                "DELETE FROM working_memory WHERE expires_at IS NOT NULL AND expires_at<=?",
                (_iso(now),),
            )
            return cursor.rowcount
