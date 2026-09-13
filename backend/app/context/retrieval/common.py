from __future__ import annotations

from ..models import ContextItem, ContextPriority, ContextType, DocumentChunk


def chunk_to_item(chunk: DocumentChunk, score: float) -> ContextItem:
    item_type = (
        ContextType.SYLLABUS
        if (chunk.document_type or "").casefold() in {"syllabus", "learning_goal", "learning goals"}
        else ContextType.KNOWLEDGE
    )
    return ContextItem(
        id=chunk.id,
        type=item_type,
        content=chunk.content,
        source=chunk.source or chunk.title,
        subject=chunk.subject,
        topic=chunk.topic,
        relevance_score=max(0.0, min(1.0, score)),
        importance_score=0.8 if item_type == ContextType.SYLLABUS else 0.6,
        token_count=chunk.token_count,
        metadata=chunk.provenance() | chunk.metadata,
        priority=ContextPriority.P1,
    )
