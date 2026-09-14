"""Creation and relevance retrieval for reusable tutoring artifacts."""

from __future__ import annotations

import uuid
from typing import Any

from ..models import ContextArtifact, ContextItem, ContextPriority, ContextType
from ..store_base import ContextStore
from ..text import lexical_overlap
from ..tokenization import TokenCounter


class ArtifactManager:
    """Persist full artifacts while injecting only compact summaries into prompts."""

    def __init__(self, store: ContextStore, counter: TokenCounter) -> None:
        """Configure artifact persistence and summary token counting."""

        self.store = store
        self.counter = counter

    def create(
        self,
        *,
        artifact_type: str,
        title: str,
        summary: str,
        content: str,
        student_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        searchable: bool = True,
        artifact_id: str | None = None,
    ) -> ContextArtifact:
        """Store an artifact and return its public metadata record."""

        artifact_id = artifact_id or str(uuid.uuid4())
        artifact = ContextArtifact(
            id=artifact_id,
            artifact_type=artifact_type,
            title=title,
            summary=summary,
            content_location=f"{self.store.location_scheme}://context_artifacts/{artifact_id}",
            token_count=self.counter.count(content),
            metadata=metadata or {},
            searchable=searchable,
            student_id=student_id,
        )
        self.store.add_artifact(artifact, content)
        return artifact

    def retrieve(self, student_id: str, query: str, *, limit: int) -> list[ContextItem]:
        """Return the student's most relevant searchable artifact summaries."""

        scored: list[ContextItem] = []
        for artifact in self.store.list_artifacts(student_id):
            score = lexical_overlap(
                query, f"{artifact.title} {artifact.summary} {artifact.content or ''}"
            )
            if score <= 0:
                continue
            content = (
                f"{artifact.title}\n{artifact.summary}\n"
                f"Artifact ID: {artifact.id}. Full result is searchable at {artifact.content_location}."
            )
            scored.append(
                ContextItem(
                    id=artifact.id,
                    type=ContextType.ARTIFACT,
                    content=content,
                    source=artifact.content_location,
                    relevance_score=score,
                    importance_score=float(artifact.metadata.get("importance", 0.6)),
                    token_count=self.counter.count(content),
                    metadata={"artifact_type": artifact.artifact_type} | artifact.metadata,
                    priority=ContextPriority.P3,
                )
            )
        return sorted(scored, key=lambda item: (-item.relevance_score, item.id))[:limit]
