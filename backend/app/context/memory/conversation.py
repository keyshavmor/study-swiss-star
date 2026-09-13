from __future__ import annotations

import uuid
from typing import Protocol

from ..config import ConversationConfig
from ..models import (
    ContextItem,
    ContextPriority,
    ContextType,
    ConversationMessage,
    ConversationSummary,
)
from ..store import SQLiteContextStore
from ..text import lexical_overlap
from ..tokenization import TokenCounter


class ConversationSummarizer(Protocol):
    async def summarize(
        self, previous_summary: str | None, messages: list[ConversationMessage]
    ) -> str: ...


class DeterministicConversationSummarizer:
    """Local fallback that keeps task/learning facts without another model call."""

    def __init__(self, max_entries: int = 18) -> None:
        self.max_entries = max_entries

    async def summarize(
        self, previous_summary: str | None, messages: list[ConversationMessage]
    ) -> str:
        entries: list[str] = []
        if previous_summary:
            entries.append("Previous compacted context:\n" + previous_summary.strip())
        meaningful = [
            message
            for message in messages
            if len(message.content.split()) >= 4
            and message.content.casefold().strip(" .!?")
            not in {"thank you", "thanks", "okay thanks", "ok thanks"}
        ]
        for message in meaningful[-self.max_entries :]:
            content = " ".join(message.content.split())
            if len(content) > 360:
                content = content[:357].rsplit(" ", 1)[0] + "…"
            entries.append(f"- {message.role}: {content}")
        return "\n".join(entries) if entries else "No durable educational context in this interval."


class ConversationMemoryManager:
    def __init__(
        self,
        store: SQLiteContextStore,
        counter: TokenCounter,
        config: ConversationConfig,
        summarizer: ConversationSummarizer | None = None,
    ) -> None:
        self.store = store
        self.counter = counter
        self.config = config
        self.summarizer = summarizer or DeterministicConversationSummarizer()

    def append(
        self,
        *,
        student_id: str,
        conversation_id: str,
        role: str,
        content: str,
        message_id: str | None = None,
        metadata: dict | None = None,
    ) -> ConversationMessage:
        if role not in {"user", "assistant", "system"}:
            raise ValueError(f"Unsupported conversation role: {role}")
        message = ConversationMessage(
            id=message_id or str(uuid.uuid4()),
            conversation_id=conversation_id,
            student_id=student_id,
            role=role,
            content=content.strip(),
            token_count=self.counter.count(content),
            metadata=metadata or {},
        )
        self.store.add_message(message)
        return message

    async def compact_if_needed(
        self, student_id: str, conversation_id: str
    ) -> ConversationSummary | None:
        messages = self.store.list_messages(student_id, conversation_id)
        previous = self.store.latest_summary(student_id, conversation_id)
        covered = set(previous.covered_message_ids if previous else [])
        unsummarized = [message for message in messages if message.id not in covered]
        token_count = sum(message.token_count for message in unsummarized)
        if (
            len(unsummarized) < self.config.summary_message_threshold
            and token_count < self.config.summary_token_threshold
        ):
            return None
        recent_ids = {message.id for message in messages[-self.config.recent_message_count :]}
        to_compact = [message for message in unsummarized if message.id not in recent_ids]
        if not to_compact:
            return None
        text = await self.summarizer.summarize(previous.summary if previous else None, to_compact)
        summary = ConversationSummary(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            student_id=student_id,
            summary=text,
            covered_message_ids=list(covered) + [message.id for message in to_compact],
            token_count=self.counter.count(text),
        )
        self.store.add_summary(summary)
        return summary

    def retrieve(
        self, student_id: str, conversation_id: str, query: str
    ) -> tuple[list[ContextItem], dict[str, int]]:
        messages = self.store.list_messages(student_id, conversation_id)
        recent = messages[-self.config.recent_message_count :]
        recent_ids = {message.id for message in recent}
        items = [self._message_item(message, ContextPriority.P2) for message in recent]
        summary = self.store.latest_summary(student_id, conversation_id)
        if summary:
            items.insert(
                0,
                ContextItem(
                    id=summary.id,
                    type=ContextType.CONVERSATION,
                    content="Rolling summary:\n" + summary.summary,
                    relevance_score=0.75,
                    importance_score=0.75,
                    token_count=summary.token_count + 4,
                    metadata={
                        "kind": "summary",
                        "covered_message_ids": summary.covered_message_ids,
                    },
                    priority=ContextPriority.P2,
                ),
            )
        older_scored = sorted(
            (
                (lexical_overlap(query, message.content), message)
                for message in messages
                if message.id not in recent_ids
            ),
            key=lambda pair: (-pair[0], pair[1].created_at),
        )
        retrieved = 0
        for score, message in older_scored:
            if score <= 0:
                continue
            item = self._message_item(message, ContextPriority.P3)
            item.relevance_score = score
            item.metadata["kind"] = "retrieved_old_message"
            items.append(item)
            retrieved += 1
            if retrieved >= self.config.retrieved_message_count:
                break
        return items, {
            "recent_messages": len(recent),
            "conversation_summaries": int(summary is not None),
            "retrieved_old_messages": retrieved,
            "stored_messages": len(messages),
        }

    @staticmethod
    def _message_item(message: ConversationMessage, priority: ContextPriority) -> ContextItem:
        return ContextItem(
            id=message.id,
            type=ContextType.CONVERSATION,
            content=f"{message.role}: {message.content}",
            relevance_score=0.65,
            importance_score=0.55,
            token_count=message.token_count + 2,
            metadata={
                "role": message.role,
                "created_at": message.created_at.isoformat(),
                "kind": "recent",
            },
            priority=priority,
        )
