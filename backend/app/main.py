"""FastAPI application exposing Alim's local context and Qwen chat services."""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from time import monotonic
from typing import Any

from fastapi import FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .context import ContextConfig, ContextManager
from .context.budget import ContextBudgetError
from .context.models import ModelConfig
from .context.retrieval import EmbeddingUnavailableError
from .services import (
    DocumentIngestor,
    LocalOpenAICompatibleClient,
    ModelRuntimeManager,
    ModelUnavailableError,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alim.api")


class CompileRequest(BaseModel):
    """Request body for compiling inspectable context without generating an answer."""

    conversation_id: str
    user_message: str = Field(min_length=1, max_length=4_000)
    subject: str | None = None
    language: str | None = None
    material_ids: list[str] = Field(default_factory=list)
    model: str | None = None
    max_context_tokens: int | None = Field(default=None, ge=512)
    reserve_output_tokens: int | None = Field(default=None, ge=64)
    debug: bool = False
    allow_web: bool = True


class ChatRequest(BaseModel):
    """Request body for one bounded, locally generated tutoring turn."""

    thread_id: str
    question: str = Field(min_length=1, max_length=4_000)
    subject_id: str | None = None
    component_subject_id: str | None = None
    language: str | None = None
    academic_year: str | None = None
    grade_level: int | None = None
    learning_goal_id: str | None = None
    material_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=6, ge=1, le=20)
    include_sources: bool = True
    stream: bool = False
    user_message_id: str | None = None
    allow_web: bool = True


class EventRequest(BaseModel):
    """Learning event persisted for later episodic retrieval."""

    event_type: str
    content: str = Field(min_length=1)
    subject: str | None = None
    topic: str | None = None
    importance: float = Field(default=0.5, ge=0, le=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ArtifactRequest(BaseModel):
    """Reusable generated artifact such as a study plan or summary."""

    artifact_type: str
    title: str
    summary: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    searchable: bool = True


class TextDocumentRequest(BaseModel):
    """Plain-text learning material plus retrieval metadata."""

    title: str
    subject: str
    document_type: str
    content: str = Field(min_length=1)
    source: str | None = None
    topic: str | None = None
    subtopic: str | None = None
    section: str | None = None
    chapter: str | None = None
    language: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


def error_response(
    status: int, code: str, message: str, request_id: str, *, retryable: bool = False
) -> JSONResponse:
    """Build the stable error envelope consumed by the frontend."""

    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "retryable": retryable,
                "request_id": request_id,
            }
        },
        headers={"X-Request-Id": request_id},
    )


def create_app(
    context_manager: ContextManager | None = None,
    llm_client: LocalOpenAICompatibleClient | None = None,
    runtime_manager: ModelRuntimeManager | None = None,
) -> FastAPI:
    """Construct an injectable app for production startup and isolated tests."""

    config = ContextConfig.from_env()
    manager = context_manager or ContextManager(config)
    llm = llm_client or LocalOpenAICompatibleClient()
    ingestor = DocumentIngestor(manager.store, manager.counter, manager.embedder)
    started = monotonic()
    manage_runtime = runtime_manager is not None or (
        context_manager is None
        and llm_client is None
        and os.getenv("ALIM_MODEL_AUTOSTART", "true").lower() == "true"
    )
    runtime = runtime_manager or (ModelRuntimeManager() if manage_runtime else None)

    @asynccontextmanager
    async def lifespan(_api: FastAPI):
        """Preload Qwen before accepting requests and stop only owned processes."""

        if runtime is not None:
            await runtime.start()
        try:
            yield
        finally:
            if runtime is not None:
                await runtime.stop()

    api = FastAPI(title="Alim local context backend", version="0.2.0", lifespan=lifespan)
    api.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Student-Id"],
        expose_headers=["X-Request-Id"],
    )

    @api.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        """Attach a correlation identifier to every request and response."""

        request.state.request_id = f"req_{uuid.uuid4().hex}"
        response = await call_next(request)
        response.headers["X-Request-Id"] = request.state.request_id
        return response

    @api.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, error: RequestValidationError):
        """Normalize Pydantic validation errors."""

        return error_response(422, "validation_error", str(error), request.state.request_id)

    @api.exception_handler(ContextBudgetError)
    async def budget_handler(request: Request, error: ContextBudgetError):
        """Explain requests that cannot fit inside the configured model window."""

        return error_response(422, "context_budget_error", str(error), request.state.request_id)

    @api.exception_handler(ModelUnavailableError)
    async def model_handler(request: Request, error: ModelUnavailableError):
        """Return a retryable response when the local model server is unavailable."""

        return error_response(
            503, "model_unavailable", str(error), request.state.request_id, retryable=True
        )

    @api.exception_handler(EmbeddingUnavailableError)
    async def embedding_handler(request: Request, error: EmbeddingUnavailableError):
        """Return a retryable response when an explicitly configured embedder fails."""

        return error_response(
            503, "embedding_unavailable", str(error), request.state.request_id, retryable=True
        )

    @api.exception_handler(ValueError)
    async def value_handler(request: Request, error: ValueError):
        """Normalize domain-level invalid requests."""

        return error_response(400, "invalid_request", str(error), request.state.request_id)

    @api.get("/health")
    async def health() -> dict[str, Any]:
        """Report API, local store, platform, and preloaded-model health."""

        status = await llm.status()
        return {
            "status": "ok" if status["reachable"] else "degraded",
            "version": "0.2.0",
            "uptime_s": round(monotonic() - started),
            "context_store": {"type": "sqlite", "reachable": True},
            "model_server": {
                "reachable": status["reachable"],
                "provider": status["provider"],
                "preloaded": status["reachable"],
            },
            "runtime": runtime.status() if runtime is not None else {"managed": False},
            "checked_at": datetime.now(UTC).isoformat(),
        }

    @api.get("/api/model/status")
    async def model_status() -> dict[str, Any]:
        """Expose the active generation and embedding model configuration."""

        status = await llm.status()
        status["embedding_model"] = manager.embedder.model_name
        return status

    @api.post("/api/context/compile")
    async def compile_context(
        body: CompileRequest, x_student_id: str = Header(default="local_student")
    ) -> dict[str, Any]:
        """Compile context for debugging or external orchestration without inference."""

        compiled = await manager.build_context(
            student_id=x_student_id,
            conversation_id=body.conversation_id,
            user_message=body.user_message,
            subject=body.subject,
            language=body.language,
            material_ids=body.material_ids,
            allow_web=body.allow_web,
            model_config=ModelConfig(
                model=body.model or llm.model,
                max_context_tokens=body.max_context_tokens,
                reserve_output_tokens=body.reserve_output_tokens,
            ),
        )
        return compiled.to_dict(include_debug=body.debug and config.debug)

    @api.post("/api/chat")
    async def chat(
        body: ChatRequest, x_student_id: str = Header(default="local_student")
    ) -> dict[str, Any]:
        """Compile bounded context, ask local Qwen, then persist reusable memory."""

        if body.stream:
            raise ValueError("Streaming is not implemented yet; send stream=false")
        retrieval_subject = body.component_subject_id or body.subject_id
        compiled = await manager.build_context(
            student_id=x_student_id,
            conversation_id=body.thread_id,
            user_message=body.question,
            subject=retrieval_subject,
            language=body.language,
            material_ids=body.material_ids,
            allow_web=body.allow_web,
            model_config=ModelConfig(model=llm.model),
        )
        result = await llm.complete(compiled)
        message_id = f"msg_{uuid.uuid4().hex}"
        await manager.process_response(
            student_id=x_student_id,
            conversation_id=body.thread_id,
            user_message=body.question,
            assistant_response=result.content,
            user_message_id=body.user_message_id,
            assistant_message_id=message_id,
            subject=retrieval_subject,
            topic=compiled.retrieval_debug.get("topics", [None])[0]
            if compiled.retrieval_debug.get("topics")
            else None,
        )
        source_items = (
            compiled.retrieved_knowledge + compiled.syllabus_context + compiled.web_context
        )
        sources = (
            [
                {
                    "source_id": item.id,
                    "material_id": item.metadata.get("document_id"),
                    "material_name": item.metadata.get("title") or item.source,
                    "section": item.metadata.get("section"),
                    "page": item.metadata.get("page"),
                    "snippet": item.content[:500],
                    "score": round(item.relevance_score, 4),
                    "url": item.metadata.get("url"),
                    "chapter": item.metadata.get("chapter"),
                }
                for item in source_items[: body.top_k]
            ]
            if body.include_sources
            else []
        )
        return {
            "thread_id": body.thread_id,
            "message_id": message_id,
            "answer": result.content,
            "sources": sources,
            "exam_tip": None,
            "used_model": result.model,
            "retrieval_summary": {
                "chunks_considered": compiled.retrieval_debug["retrieval"].get(
                    "fused_candidates", 0
                ),
                "chunks_used": len(source_items),
                "collections": [retrieval_subject] if retrieval_subject else [],
            },
            "language": body.language,
            "created_at": datetime.now(UTC).isoformat(),
        }

    @api.post("/api/context/events")
    async def record_event(
        body: EventRequest, x_student_id: str = Header(default="local_student")
    ) -> dict[str, Any]:
        """Persist a learning event for later progress-aware retrieval."""

        event = manager.record_event(student_id=x_student_id, event=body.model_dump())
        return {"event_id": event.id, "created_at": event.occurred_at.isoformat()}

    @api.post("/api/context/artifacts")
    async def create_artifact(
        body: ArtifactRequest, x_student_id: str = Header(default="local_student")
    ) -> dict[str, Any]:
        """Persist a reusable context artifact."""

        artifact = manager.artifacts.create(student_id=x_student_id, **body.model_dump())
        return artifact.to_dict()

    @api.post("/api/context/documents/text")
    async def ingest_text(
        body: TextDocumentRequest, x_student_id: str = Header(default="local_student")
    ) -> dict[str, Any]:
        """Chunk, embed, and index operator-provided text material."""

        chunks = await ingestor.ingest_text(student_id=x_student_id, **body.model_dump())
        return {
            "document_id": chunks[0].document_id,
            "chunks_indexed": len(chunks),
            "token_count": sum(chunk.token_count for chunk in chunks),
        }

    return api


app = create_app()
