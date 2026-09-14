"""Orchestrate intent analysis, retrieval, budgeting, compilation, and memory writes."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from .artifacts import ArtifactManager
from .budget import ContextBudgeter, ContextBudgetError
from .compiler import ContextCompiler
from .config import ContextConfig
from .intent import HeuristicQueryAnalyzer
from .memory import ConversationMemoryManager, EpisodicMemoryManager, StudentMemoryManager
from .models import CompiledContext, ContextItem, ContextPriority, ContextType, ModelConfig
from .retrieval import (
    DenseRetriever,
    Embedder,
    HashingEmbedder,
    HeuristicReranker,
    HybridRetriever,
    OpenAICompatibleEmbedder,
    SparseRetriever,
)
from .store import SQLiteContextStore
from .store_base import ContextStore
from .text import normalize_text
from .tokenization import ApproximateTokenCounter, TokenCounter
from .web import CachedWebRetriever, WebRetrievalError

logger = logging.getLogger("alim.context")


class ContextManager:
    """The single orchestration boundary for everything sent to Alim's local LLM."""

    def __init__(
        self,
        config: ContextConfig | None = None,
        *,
        store: ContextStore | None = None,
        token_counter: TokenCounter | None = None,
        embedder: Embedder | None = None,
        retriever: HybridRetriever | None = None,
        reranker: HeuristicReranker | None = None,
        web_retriever: CachedWebRetriever | None = None,
    ) -> None:
        """Wire persistence, retrieval, memory, budgeting, and compilation services."""

        self.config = config or ContextConfig.from_env()
        self.store = store or SQLiteContextStore(self.config.database_path)
        self.counter = token_counter or ApproximateTokenCounter()
        self.embedder = embedder or self._create_embedder()
        self.retriever = retriever or HybridRetriever(
            DenseRetriever(
                self.store,
                self.embedder,
                max_chunks=self.config.retrieval.candidate_limit,
            ),
            SparseRetriever(self.store, max_chunks=self.config.retrieval.candidate_limit),
            dense_weight=self.config.retrieval.dense_weight,
            sparse_weight=self.config.retrieval.sparse_weight,
            rrf_k=self.config.retrieval.rrf_k,
            dense_limit=self.config.retrieval.dense_limit,
            sparse_limit=self.config.retrieval.sparse_limit,
        )
        self.reranker = reranker or HeuristicReranker()
        self.analyzer = HeuristicQueryAnalyzer()
        self.memory = StudentMemoryManager(self.store, self.counter, self.config.memory)
        self.episodes = EpisodicMemoryManager(self.store, self.counter)
        self.conversations = ConversationMemoryManager(
            self.store, self.counter, self.config.conversation
        )
        self.artifacts = ArtifactManager(self.store, self.counter)
        self.budgeter = ContextBudgeter(self.config.budget)
        self.compiler = ContextCompiler(self.counter)
        self.web = web_retriever or CachedWebRetriever(self.store, self.counter, self.config.web)

    def _create_embedder(self) -> Embedder:
        """Choose the configured local endpoint or deterministic hashing fallback."""

        embedding = self.config.embedding
        if embedding.model:
            return OpenAICompatibleEmbedder(
                base_url=embedding.base_url,
                model=embedding.model,
                api_key=embedding.api_key,
                timeout_seconds=embedding.timeout_seconds,
            )
        return HashingEmbedder(embedding.fallback_dimensions)

    async def build_context(
        self,
        *,
        student_id: str,
        conversation_id: str,
        user_message: str,
        model_config: ModelConfig,
        subject: str | None = None,
        language: str | None = None,
        material_ids: list[str] | None = None,
        allow_web: bool = True,
    ) -> CompiledContext:
        """Retrieve only intent-relevant data and compile it within the hard token budget."""

        query = self.analyzer.analyze(user_message, subject_hint=subject, language_hint=language)
        debug: dict[str, Any] = {
            "intent": query.intent,
            "subject": query.subject,
            "topics": query.topics,
            "retrieval": {
                "dense_chunks": 0,
                "sparse_chunks": 0,
                "fused_candidates": 0,
                "deduplicated_candidates": 0,
                "reranked_chunks": 0,
            },
        }
        items: list[ContextItem] = []
        student_items: list[ContextItem] = []
        if query.requires_student_memory:
            student_items = self.memory.retrieve(
                student_id,
                user_message,
                subject=query.subject,
                topics=query.topics,
                limit=self.config.retrieval.memory_limit,
            )
            items.extend(student_items)
        debug["student_memories_retrieved"] = len(student_items)

        if query.requires_episode_memory:
            episode_items = self.episodes.retrieve(
                student_id,
                user_message,
                subject=query.subject,
                topics=query.topics,
                limit=self.config.retrieval.episode_limit,
            )
            items.extend(episode_items)
            debug["episodes_retrieved"] = len(episode_items)
        else:
            debug["episodes_retrieved"] = 0

        if query.requires_conversation_history:
            conversation_items, conversation_debug = self.conversations.retrieve(
                student_id, conversation_id, user_message
            )
            items.extend(conversation_items)
            debug.update(conversation_debug)

        selected_documents = set(material_ids or []) or None
        knowledge: list[ContextItem] = []
        if query.requires_documents:
            knowledge = await self.retriever.retrieve(
                user_message,
                student_id=student_id,
                subject=query.subject,
                document_types={
                    "textbook",
                    "notes",
                    "pdf",
                    "docx",
                    "markdown",
                    "worksheet",
                    "past_exam",
                    "marking_scheme",
                    "teacher_material",
                },
                document_ids=selected_documents,
                limit=self.config.retrieval.fused_limit,
            )
            debug["retrieval"].update(self.retriever.last_debug)
            knowledge = await self.reranker.rerank(
                user_message,
                knowledge,
                self.config.retrieval.rerank_limit,
                query_context=query,
                student_topics={item.topic for item in student_items if item.topic},
            )
            knowledge = [
                item
                for item in knowledge
                if item.relevance_score >= self.config.retrieval.minimum_relevance
            ]
            items.extend(knowledge)
        debug["retrieval"]["reranked_chunks"] = len(knowledge)

        syllabus: list[ContextItem] = []
        if query.requires_syllabus:
            syllabus = await self.retriever.retrieve(
                user_message,
                student_id=student_id,
                subject=query.subject,
                document_types={"syllabus", "learning_goal", "learning goals"},
                document_ids=selected_documents,
                limit=min(4, self.config.retrieval.rerank_limit),
            )
            syllabus = await self.reranker.rerank(
                user_message,
                syllabus,
                min(4, self.config.retrieval.rerank_limit),
                query_context=query,
            )
            items.extend(syllabus)
        debug["syllabus_chunks_retrieved"] = len(syllabus)

        web_items: list[ContextItem] = []
        missing_local_material = query.requires_documents and not knowledge and not syllabus
        should_retrieve_web = query.requires_web or missing_local_material
        debug["web"] = {
            "requested": query.requires_web,
            "missing_local_material": missing_local_material,
            "allowed": allow_web,
            "cache_hit": False,
        }
        if self.config.web.enabled and allow_web and should_retrieve_web:
            try:
                web_items, cache_hit = await self.web.retrieve(user_message)
                debug["web"].update({"cache_hit": cache_hit, "results_retrieved": len(web_items)})
                items.extend(web_items)
            except WebRetrievalError as error:
                debug["web"].update({"results_retrieved": 0, "error": str(error)})
        else:
            debug["web"]["results_retrieved"] = 0

        artifact_items = self.artifacts.retrieve(
            student_id, user_message, limit=self.config.retrieval.artifact_limit
        )
        items.extend(artifact_items)
        debug["artifacts_retrieved"] = len(artifact_items)

        now = datetime.now(UTC)
        self.store.purge_expired_working_memory(now=now)
        working_items = [
            ContextItem(
                id=row["id"],
                type=ContextType.WORKING_MEMORY,
                content=row["content"],
                relevance_score=1.0,
                importance_score=float(row["metadata"].get("importance", 0.8)),
                token_count=row["token_count"],
                metadata=row["metadata"],
                priority=ContextPriority.P0
                if row["metadata"].get("critical")
                else ContextPriority.P1,
            )
            for row in self.store.list_working_memory(student_id, conversation_id, now=now)
        ]
        items.extend(working_items)
        debug["working_items_retrieved"] = len(working_items)

        items = self._deduplicate_all(items)
        for item in items:
            if item.token_count <= 0:
                item.token_count = self.counter.count(item.content)
        fixed_tokens = (
            self.counter.count(self.compiler.system_context)
            + self.counter.count(user_message)
            + 128
        )
        budget = self.budgeter.apply(items, fixed_tokens=fixed_tokens, model_config=model_config)
        debug["token_budget"] = {
            "used": budget.used_tokens,
            "input_limit": budget.input_limit,
            "max_context": model_config.max_context_tokens or self.config.budget.max_context_tokens,
            "reserved_output": model_config.reserve_output_tokens
            or self.config.budget.reserve_output_tokens,
            "sections": budget.section_tokens,
            "items_removed": len(budget.removed),
            "removed_item_ids": [item.id for item in budget.removed],
        }
        compiled = self.compiler.compile(
            query_context=query, user_message=user_message, items=budget.kept, debug=debug
        )
        while compiled.total_tokens > budget.input_limit:
            removable = sorted(
                (item for item in budget.kept if item.priority != ContextPriority.P0),
                key=lambda item: (
                    -int(item.priority),
                    item.importance_score,
                    item.relevance_score,
                    -item.token_count,
                    item.id,
                ),
            )
            if not removable:
                raise ContextBudgetError(
                    "Critical context and prompt framing exceed the configured input budget"
                )
            item = removable[0]
            budget.kept.remove(item)
            budget.removed.append(item)
            section = (
                "summary"
                if item.type == ContextType.CONVERSATION and item.metadata.get("kind") == "summary"
                else item.type.value
            )
            budget.section_tokens[section] = max(
                0, budget.section_tokens.get(section, 0) - item.token_count
            )
            debug["token_budget"].update(
                {
                    "sections": budget.section_tokens,
                    "items_removed": len(budget.removed),
                    "removed_item_ids": [value.id for value in budget.removed],
                }
            )
            compiled = self.compiler.compile(
                query_context=query,
                user_message=user_message,
                items=budget.kept,
                debug=debug,
            )
        debug["token_budget"]["used"] = compiled.total_tokens
        if self.config.debug:
            logger.info("context_compiled %s", json.dumps(debug, ensure_ascii=False, default=str))
        return compiled

    async def process_response(
        self,
        *,
        student_id: str,
        conversation_id: str,
        user_message: str,
        assistant_response: str,
        metadata: dict[str, Any] | None = None,
        user_message_id: str | None = None,
        assistant_message_id: str | None = None,
        subject: str | None = None,
        topic: str | None = None,
    ) -> dict[str, Any]:
        """Persist a completed turn, extract safe memory, and compact long conversations."""

        # Supabase messages are the canonical UI transcript. The frontend has
        # already inserted the user turn and inserts the assistant turn after
        # streaming finishes, so writing either here would create a second
        # transcript. SQLite retains the old append behavior for isolated tests.
        if not self.store.canonical_transcript:
            self.conversations.append(
                student_id=student_id,
                conversation_id=conversation_id,
                role="user",
                content=user_message,
                message_id=user_message_id,
            )
            self.conversations.append(
                student_id=student_id,
                conversation_id=conversation_id,
                role="assistant",
                content=assistant_response,
                message_id=assistant_message_id,
            )
        memories = self.memory.process_interaction(
            student_id=student_id,
            user_message=user_message,
            subject=subject,
            topic=topic,
            metadata=metadata,
        )
        summary = await self.conversations.compact_if_needed(student_id, conversation_id)
        return {
            "memories_written": [memory.id for memory in memories],
            "conversation_compacted": summary is not None,
            "summary_id": summary.id if summary else None,
        }

    def record_event(self, *, student_id: str, event: dict[str, Any]) -> Any:
        """Store one learning event through the episodic-memory boundary."""

        return self.episodes.record(student_id=student_id, **event)

    def add_working_memory(
        self,
        *,
        student_id: str,
        conversation_id: str,
        content: str,
        task_id: str | None = None,
        ttl_minutes: int = 120,
        critical: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Add short-lived task state that can be marked mandatory for the next turn."""

        item_id = str(uuid.uuid4())
        now = datetime.now(UTC)
        self.store.add_working_memory(
            item_id=item_id,
            student_id=student_id,
            conversation_id=conversation_id,
            task_id=task_id,
            content=content,
            token_count=self.counter.count(content),
            metadata=(metadata or {}) | {"critical": critical},
            created_at=now,
            expires_at=now + timedelta(minutes=ttl_minutes) if ttl_minutes > 0 else None,
        )
        return item_id

    @staticmethod
    def _deduplicate_all(items: list[ContextItem]) -> list[ContextItem]:
        """Remove repeated IDs/content while preserving the highest-priority item."""

        seen_ids: set[str] = set()
        seen_content: set[str] = set()
        result: list[ContextItem] = []
        for item in sorted(
            items,
            key=lambda value: (
                int(value.priority),
                -value.importance_score,
                -value.relevance_score,
            ),
        ):
            normalized = normalize_text(item.content)
            if item.id in seen_ids or normalized in seen_content:
                continue
            seen_ids.add(item.id)
            seen_content.add(normalized)
            result.append(item)
        return result
