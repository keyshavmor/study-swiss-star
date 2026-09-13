"""Typed records exchanged by Alim's context, retrieval, and persistence layers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from enum import IntEnum, StrEnum
from typing import Any


def utc_now() -> datetime:
    """Return a timezone-aware timestamp for dataclass defaults."""

    return datetime.now(UTC)


class ContextType(StrEnum):
    """Context sections with independent budgets and rendering rules."""

    KNOWLEDGE = "knowledge"
    STUDENT_MEMORY = "student_memory"
    EPISODE = "episode"
    CONVERSATION = "conversation"
    SYLLABUS = "syllabus"
    ARTIFACT = "artifact"
    WORKING_MEMORY = "working_memory"
    WEB = "web"


class ContextPriority(IntEnum):
    """Removal order where P0 is mandatory and P3 is easiest to discard."""

    P0 = 0
    P1 = 1
    P2 = 2
    P3 = 3


@dataclass(slots=True)
class ContextItem:
    """Normalized retrieval item considered by the budgeter and compiler."""

    id: str
    type: ContextType
    content: str
    source: str | None = None
    subject: str | None = None
    topic: str | None = None
    relevance_score: float = 0.0
    importance_score: float = 0.0
    confidence: float | None = None
    token_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)
    priority: ContextPriority = ContextPriority.P2

    def to_dict(self) -> dict[str, Any]:
        """Serialize enums by stable public names."""

        value = asdict(self)
        value["type"] = self.type.value
        value["priority"] = self.priority.name
        return value


@dataclass(slots=True)
class QueryContext:
    """Intent analysis result controlling which retrieval paths execute."""

    intent: str
    subject: str | None = None
    topics: list[str] = field(default_factory=list)
    language: str | None = None
    requires_documents: bool = False
    requires_student_memory: bool = False
    requires_episode_memory: bool = False
    requires_conversation_history: bool = True
    requires_syllabus: bool = False
    requires_web: bool = False
    desired_output_type: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize the inferred intent for debug responses."""

        return asdict(self)


@dataclass(slots=True, frozen=True)
class ModelConfig:
    """Per-request model identity and optional context-budget overrides."""

    model: str
    max_context_tokens: int | None = None
    reserve_output_tokens: int | None = None


@dataclass(slots=True)
class ConversationMessage:
    """One immutable user or assistant turn in local conversation history."""

    id: str
    conversation_id: str
    student_id: str
    role: str
    content: str
    token_count: int
    created_at: datetime = field(default_factory=utc_now)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class StudentMemory:
    """Evidence-backed durable fact about a learner's needs or preferences."""

    id: str
    student_id: str
    memory_type: str
    content: str
    subject: str | None = None
    topic: str | None = None
    confidence: float = 0.5
    importance: float = 0.5
    evidence: list[str] = field(default_factory=list)
    evidence_count: int = 1
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    last_accessed_at: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LearningEvent:
    """Timestamped assessment or activity used for episodic retrieval."""

    id: str
    student_id: str
    event_type: str
    content: str
    subject: str | None = None
    topic: str | None = None
    occurred_at: datetime = field(default_factory=utc_now)
    importance: float = 0.5
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ConversationSummary:
    """Compact replacement context for older messages that remain stored verbatim."""

    id: str
    conversation_id: str
    student_id: str
    summary: str
    covered_message_ids: list[str]
    token_count: int
    created_at: datetime = field(default_factory=utc_now)


@dataclass(slots=True)
class DocumentChunk:
    """Searchable learning-material segment with provenance and optional embedding."""

    id: str
    document_id: str
    content: str
    title: str
    subject: str | None = None
    topic: str | None = None
    subtopic: str | None = None
    document_type: str | None = None
    source: str | None = None
    page: int | None = None
    section: str | None = None
    chapter: str | None = None
    language: str | None = None
    created_at: datetime = field(default_factory=utc_now)
    token_count: int = 0
    embedding: list[float] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def provenance(self) -> dict[str, Any]:
        """Return the source metadata shown alongside retrieved material."""

        return {
            key: value
            for key, value in {
                "document_id": self.document_id,
                "title": self.title,
                "source": self.source,
                "page": self.page,
                "section": self.section,
                "chapter": self.chapter,
                "subject": self.subject,
                "topic": self.topic,
                "subtopic": self.subtopic,
                "document_type": self.document_type,
                "language": self.language,
            }.items()
            if value is not None
        }


@dataclass(slots=True)
class ContextArtifact:
    """Reusable output such as a study plan, quiz, or generated summary."""

    id: str
    artifact_type: str
    title: str
    summary: str
    content_location: str
    token_count: int
    metadata: dict[str, Any] = field(default_factory=dict)
    searchable: bool = True
    created_at: datetime = field(default_factory=utc_now)
    student_id: str | None = None
    content: str | None = field(default=None, repr=False)

    def to_dict(self) -> dict[str, Any]:
        """Serialize an artifact for the API."""

        value = asdict(self)
        value["created_at"] = self.created_at.isoformat()
        value.pop("content", None)
        return value


@dataclass(slots=True)
class CompiledContext:
    """Final model prompt plus the structured evidence and token audit that produced it."""

    system_context: str
    student_context: str
    conversation_context: str
    retrieved_knowledge: list[ContextItem]
    episodic_context: list[ContextItem]
    working_context: list[ContextItem]
    syllabus_context: list[ContextItem]
    artifact_context: list[ContextItem]
    web_context: list[ContextItem]
    total_tokens: int
    retrieval_debug: dict[str, Any]
    prompt_messages: list[dict[str, str]]

    def to_dict(self, *, include_debug: bool = False) -> dict[str, Any]:
        """Serialize context while hiding retrieval internals unless explicitly requested."""

        value: dict[str, Any] = {
            "system_context": self.system_context,
            "student_context": self.student_context,
            "conversation_context": self.conversation_context,
            "retrieved_knowledge": [item.to_dict() for item in self.retrieved_knowledge],
            "episodic_context": [item.to_dict() for item in self.episodic_context],
            "working_context": [item.to_dict() for item in self.working_context],
            "syllabus_context": [item.to_dict() for item in self.syllabus_context],
            "artifact_context": [item.to_dict() for item in self.artifact_context],
            "web_context": [item.to_dict() for item in self.web_context],
            "total_tokens": self.total_tokens,
            "prompt_messages": self.prompt_messages,
        }
        if include_debug:
            value["retrieval_debug"] = self.retrieval_debug
        return value
