"""Environment-backed configuration for retrieval, memory, web, and token budgets."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from ..model_spec import repository_root
from ..platform import context_window_from_env, detect_host, local_model_base_url


def _env_int(name: str, default: int) -> int:
    """Read an integer environment override or use its documented default."""

    raw = os.getenv(name)
    return int(raw) if raw is not None else default


def _env_float(name: str, default: float) -> float:
    """Read a floating-point environment override or use its default."""

    raw = os.getenv(name)
    return float(raw) if raw is not None else default


@dataclass(slots=True, frozen=True)
class ContextBudgetConfig:
    """Global model window and maximum allocation for every context section."""

    max_context_tokens: int = 65_536
    reserve_output_tokens: int = 16_384
    system_tokens: int = 2_000
    recent_chat_tokens: int = 6_000
    summary_tokens: int = 2_000
    memory_tokens: int = 4_000
    knowledge_tokens: int = 20_000
    syllabus_tokens: int = 2_000
    episode_tokens: int = 3_000
    artifact_tokens: int = 3_000
    working_memory_tokens: int = 4_000
    web_tokens: int = 6_000


@dataclass(slots=True, frozen=True)
class RetrievalConfig:
    """Candidate, ranking, fusion, and relevance controls."""

    candidate_limit: int = 500
    dense_limit: int = 15
    sparse_limit: int = 15
    fused_limit: int = 10
    rerank_limit: int = 6
    memory_limit: int = 5
    episode_limit: int = 5
    artifact_limit: int = 3
    minimum_relevance: float = 0.05
    dense_weight: float = 1.0
    sparse_weight: float = 1.0
    rrf_k: int = 60


@dataclass(slots=True, frozen=True)
class ConversationConfig:
    """Recent-message retrieval and long-thread compaction thresholds."""

    recent_message_count: int = 8
    retrieved_message_count: int = 4
    summary_message_threshold: int = 20
    summary_token_threshold: int = 8_000


@dataclass(slots=True, frozen=True)
class MemoryConfig:
    """Evidence thresholds that prevent weak facts becoming durable memory."""

    minimum_confidence: float = 0.65
    minimum_importance: float = 0.4
    mastery_evidence_threshold: int = 2


@dataclass(slots=True, frozen=True)
class EmbeddingConfig:
    """Optional local embedding endpoint with deterministic offline fallback."""

    base_url: str = "http://127.0.0.1:8000/v1"
    model: str | None = None
    api_key: str = "local"
    timeout_seconds: float = 30.0
    fallback_dimensions: int = 384


@dataclass(slots=True, frozen=True)
class WebConfig:
    """Intent-gated local-first reference retrieval and response-size settings."""

    enabled: bool = True
    provider: str = "auto"
    local_corpus_path: Path = field(default_factory=lambda: repository_root() / "material" / "web")
    max_results: int = 4
    timeout_seconds: float = 8.0
    cache_ttl_minutes: int = 1_440
    max_chars_per_result: int = 6_000
    user_agent: str = "AlimStudyApp/0.2 (local educational context retrieval)"


@dataclass(slots=True, frozen=True)
class ContextConfig:
    """Complete context subsystem configuration."""

    database_path: Path = field(
        default_factory=lambda: repository_root() / "app-data" / "context" / "alim-context.db"
    )
    debug: bool = False
    budget: ContextBudgetConfig = field(default_factory=ContextBudgetConfig)
    retrieval: RetrievalConfig = field(default_factory=RetrievalConfig)
    conversation: ConversationConfig = field(default_factory=ConversationConfig)
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    embedding: EmbeddingConfig = field(default_factory=EmbeddingConfig)
    web: WebConfig = field(default_factory=WebConfig)

    @classmethod
    def from_env(cls) -> ContextConfig:
        """Load settings while adapting the default context budget to the host hardware."""

        profile = detect_host()
        maximum = context_window_from_env(profile)
        default_reserve = min(16_384, maximum // 4)
        budget = ContextBudgetConfig(
            max_context_tokens=maximum,
            reserve_output_tokens=_env_int("ALIM_RESERVED_OUTPUT_TOKENS", default_reserve),
            system_tokens=_env_int("ALIM_SYSTEM_TOKENS", 2_000),
            recent_chat_tokens=_env_int("ALIM_RECENT_CHAT_TOKENS", 6_000),
            summary_tokens=_env_int("ALIM_SUMMARY_TOKENS", 2_000),
            memory_tokens=_env_int("ALIM_MEMORY_TOKENS", 4_000),
            knowledge_tokens=_env_int("ALIM_KNOWLEDGE_TOKENS", 20_000),
            syllabus_tokens=_env_int("ALIM_SYLLABUS_TOKENS", 2_000),
            episode_tokens=_env_int("ALIM_EPISODE_TOKENS", 3_000),
            artifact_tokens=_env_int("ALIM_ARTIFACT_TOKENS", 3_000),
            working_memory_tokens=_env_int("ALIM_WORKING_MEMORY_TOKENS", 4_000),
            web_tokens=_env_int("ALIM_WEB_TOKENS", 6_000),
        )
        retrieval = RetrievalConfig(
            candidate_limit=_env_int("ALIM_RETRIEVAL_CANDIDATES", 500),
            dense_limit=_env_int("ALIM_DENSE_LIMIT", 15),
            sparse_limit=_env_int("ALIM_SPARSE_LIMIT", 15),
            fused_limit=_env_int("ALIM_FUSED_LIMIT", 10),
            rerank_limit=_env_int("ALIM_RERANK_LIMIT", 6),
            memory_limit=_env_int("ALIM_MEMORY_LIMIT", 5),
            episode_limit=_env_int("ALIM_EPISODE_LIMIT", 5),
            artifact_limit=_env_int("ALIM_ARTIFACT_LIMIT", 3),
            minimum_relevance=_env_float("ALIM_MIN_RELEVANCE", 0.05),
            dense_weight=_env_float("ALIM_DENSE_WEIGHT", 1.0),
            sparse_weight=_env_float("ALIM_SPARSE_WEIGHT", 1.0),
            rrf_k=_env_int("ALIM_RRF_K", 60),
        )
        conversation = ConversationConfig(
            recent_message_count=_env_int("ALIM_RECENT_MESSAGE_COUNT", 8),
            retrieved_message_count=_env_int("ALIM_RETRIEVED_MESSAGE_COUNT", 4),
            summary_message_threshold=_env_int("ALIM_SUMMARY_MESSAGE_THRESHOLD", 20),
            summary_token_threshold=_env_int("ALIM_SUMMARY_TOKEN_THRESHOLD", 8_000),
        )
        memory = MemoryConfig(
            minimum_confidence=_env_float("ALIM_MEMORY_MIN_CONFIDENCE", 0.65),
            minimum_importance=_env_float("ALIM_MEMORY_MIN_IMPORTANCE", 0.4),
            mastery_evidence_threshold=_env_int("ALIM_MASTERY_EVIDENCE_THRESHOLD", 2),
        )
        embedding = EmbeddingConfig(
            base_url=os.getenv(
                "ALIM_EMBEDDING_BASE_URL",
                local_model_base_url(),
            ),
            model=os.getenv("ALIM_EMBEDDING_MODEL") or None,
            api_key=os.getenv("ALIM_EMBEDDING_API_KEY", "local"),
            timeout_seconds=_env_float("ALIM_EMBEDDING_TIMEOUT_SECONDS", 30.0),
            fallback_dimensions=_env_int("ALIM_HASH_EMBEDDING_DIMENSIONS", 384),
        )
        web = WebConfig(
            enabled=os.getenv("ALIM_WEB_ENABLED", "true").lower() == "true",
            provider=os.getenv("ALIM_WEB_PROVIDER", "auto").strip().lower(),
            local_corpus_path=Path(
                os.getenv(
                    "ALIM_LOCAL_WEB_ROOT",
                    str(repository_root() / "material" / "web"),
                )
            ),
            max_results=_env_int("ALIM_WEB_MAX_RESULTS", 4),
            timeout_seconds=_env_float("ALIM_WEB_TIMEOUT_SECONDS", 8.0),
            cache_ttl_minutes=_env_int("ALIM_WEB_CACHE_TTL_MINUTES", 1_440),
            max_chars_per_result=_env_int("ALIM_WEB_MAX_CHARS_PER_RESULT", 6_000),
            user_agent=os.getenv(
                "ALIM_WEB_USER_AGENT", "AlimStudyApp/0.2 (local educational context retrieval)"
            ),
        )
        return cls(
            database_path=Path(
                os.getenv(
                    "ALIM_CONTEXT_DB",
                    str(repository_root() / "app-data" / "context" / "alim-context.db"),
                )
            ),
            debug=os.getenv("ALIM_CONTEXT_DEBUG", "false").lower() == "true",
            budget=budget,
            retrieval=retrieval,
            conversation=conversation,
            memory=memory,
            embedding=embedding,
            web=web,
        )
