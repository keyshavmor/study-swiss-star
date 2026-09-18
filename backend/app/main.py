"""FastAPI application exposing Alim's local context and Qwen chat services."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections.abc import Callable
from contextlib import asynccontextmanager
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from time import monotonic
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .artifact_store import ArtifactStore
from .auth import AccessTokenVerifier, AuthenticatedUser, BearerAuthenticator
from .config import BackendSettings
from .context import ContextConfig, ContextManager
from .context.budget import ContextBudgetError
from .context.models import ModelConfig
from .context.retrieval import EmbeddingUnavailableError
from .context.store_supabase import SupabaseContextStore, SupabaseStoreError
from .contracts import LivenessResponse, ReadinessCheck, ReadinessResponse
from .errors import ApiError, error_response
from .model_registry import MODEL_REGISTRY, model_cache_root
from .runtime_control import RuntimeCoordinator
from .services import (
    DocumentIngestor,
    LocalOpenAICompatibleClient,
    ModelRuntimeManager,
    ModelUnavailableError,
)
from .system_probe import SystemProbe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alim.api")

SupportedLanguage = Literal["en", "de", "gsw", "ru", "es", "fr", "it"]


class RequestIdMiddleware:
    """Attach a request identifier without spawning BaseHTTPMiddleware tasks."""

    def __init__(self, app: ASGIApp, *, contract_version: str) -> None:
        self.app = app
        self.contract_version = contract_version

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = f"req_{uuid.uuid4().hex}"
        scope.setdefault("state", {})["request_id"] = request_id

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                names = {name.lower() for name, _value in headers}
                if b"x-request-id" not in names:
                    headers.append((b"x-request-id", request_id.encode("ascii")))
                if b"x-alim-contract-version" not in names:
                    headers.append(
                        (b"x-alim-contract-version", self.contract_version.encode("ascii"))
                    )
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_request_id)


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
    language: SupportedLanguage | None = None
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


class StorageDocumentRequest(BaseModel):
    """A private Supabase Storage object to download temporarily and index locally."""

    document_id: str
    storage_path: str
    original_filename: str
    title: str
    subject: str
    document_type: str
    section: str | None = None
    topic: str | None = None
    language: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CapabilityRequest(BaseModel):
    """Caller-visible catalogue constraint for a truthful local probe."""

    preferred_model_id: str | None = None
    model_catalog: list[str] = Field(default_factory=list, max_length=100)


class AdmissionCheckRequest(BaseModel):
    """Live policy is data supplied by the authenticated server adapter."""

    preferred_model_id: str | None = None
    policy: dict[str, Any] = Field(default_factory=dict)


class PercentThresholds(BaseModel):
    """Free-resource thresholds supplied by the current policy RPC."""

    gpu_free_percent: float = Field(ge=0, le=100)
    ram_free_percent: float = Field(ge=0, le=100)
    storage_free_percent: float = Field(ge=0, le=100)


class ModelPrepareRequest(BaseModel):
    """Exact frontend model-preparation request contract."""

    model_id: str = Field(min_length=1, max_length=200)
    admission_policy: PercentThresholds
    runtime_floors: PercentThresholds
    deduplicate_downloads: bool = True
    report_active_users: bool = True


class LeaseRequest(BaseModel):
    """Caller-scoped lease reference; ownership comes from the bearer token."""

    lease_id: str = Field(min_length=1, max_length=200)


class ReleaseRequest(BaseModel):
    """Optional caller-scoped lease release."""

    lease_id: str | None = Field(default=None, max_length=200)


def create_app(
    context_manager: ContextManager | None = None,
    llm_client: LocalOpenAICompatibleClient | None = None,
    runtime_manager: ModelRuntimeManager | None = None,
    auth_verifier: AccessTokenVerifier | None = None,
    context_manager_factory: Callable[[str, str], ContextManager] | None = None,
    settings: BackendSettings | None = None,
    runtime_coordinator: RuntimeCoordinator | None = None,
) -> FastAPI:
    """Construct an injectable app for production startup and isolated tests."""

    config = ContextConfig.from_env()
    backend_settings = settings or BackendSettings.from_env()
    authenticator = BearerAuthenticator(auth_verifier)
    llm = llm_client or LocalOpenAICompatibleClient()
    started = monotonic()
    production_runtime = context_manager is None and llm_client is None
    runtime = runtime_manager or (ModelRuntimeManager() if production_runtime else None)
    autostart_runtime = bool(
        runtime
        and (
            runtime_manager is not None
            or os.getenv("ALIM_MODEL_AUTOSTART", "false").lower() == "true"
        )
    )

    async def runtime_ready(model_id: str) -> bool:
        return bool(runtime and runtime.config.model_name == model_id and await runtime.is_ready())

    async def prepare_runtime(model_id: str, path: Path) -> bool:
        if runtime is None or model_id != "Qwen/Qwen3.8-27B":
            return False
        if runtime.config.model_path != path.parent:
            runtime.config = replace(runtime.config, model_path=path.parent, model_name=model_id)
        await runtime.start()
        return await runtime.is_ready()

    probe = runtime_coordinator.probe if runtime_coordinator else SystemProbe()
    coordinator = runtime_coordinator or RuntimeCoordinator(
        probe=probe,
        state_path=model_cache_root().parent / "runtime-state.json",
        runtime_ready=runtime_ready,
        runtime_prepare=prepare_runtime,
        runtime_release=runtime.stop if runtime else None,
        artifact_store=ArtifactStore(model_cache_root()),
    )

    @asynccontextmanager
    async def lifespan(_api: FastAPI):
        """Preload Qwen before accepting requests and stop only owned processes."""

        if runtime is not None and autostart_runtime:
            await runtime.start()
        stop_sweeper = asyncio.Event()

        async def sweep_leases() -> None:
            while not stop_sweeper.is_set():
                try:
                    await asyncio.wait_for(stop_sweeper.wait(), timeout=15)
                except TimeoutError:
                    await coordinator.sweep()

        sweeper = asyncio.create_task(sweep_leases())
        try:
            yield
        finally:
            stop_sweeper.set()
            sweeper.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await sweeper
            if runtime is not None:
                await runtime.stop()

    api = FastAPI(title="Alim local context backend", version="0.3.0", lifespan=lifespan)
    api.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=list(backend_settings.allowed_hosts),
    )
    api.add_middleware(
        CORSMiddleware,
        allow_origins=list(backend_settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Student-Id"],
        expose_headers=["X-Request-Id", "X-Alim-Contract-Version"],
    )
    api.add_middleware(
        RequestIdMiddleware,
        contract_version=backend_settings.contract_version,
    )

    @api.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, error: RequestValidationError):
        """Normalize Pydantic validation errors."""

        del error
        return error_response(
            ApiError(422, "validation_error", "Request validation failed"),
            request.state.request_id,
        )

    @api.exception_handler(ContextBudgetError)
    async def budget_handler(request: Request, error: ContextBudgetError):
        """Explain requests that cannot fit inside the configured model window."""

        del error
        return error_response(
            ApiError(422, "context_budget_error", "Request exceeds the context budget"),
            request.state.request_id,
        )

    @api.exception_handler(ModelUnavailableError)
    async def model_handler(request: Request, error: ModelUnavailableError):
        """Return a retryable response when the local model server is unavailable."""

        del error
        return error_response(
            ApiError(503, "model_unavailable", "The local model is unavailable", retryable=True),
            request.state.request_id,
        )

    @api.exception_handler(EmbeddingUnavailableError)
    async def embedding_handler(request: Request, error: EmbeddingUnavailableError):
        """Return a retryable response when an explicitly configured embedder fails."""

        del error
        return error_response(
            ApiError(
                503,
                "embedding_unavailable",
                "The local embedding service is unavailable",
                retryable=True,
            ),
            request.state.request_id,
        )

    @api.exception_handler(ValueError)
    async def value_handler(request: Request, error: ValueError):
        """Normalize domain-level invalid requests."""

        del error
        return error_response(
            ApiError(400, "invalid_request", "The request is invalid"),
            request.state.request_id,
        )

    @api.exception_handler(ApiError)
    async def api_error_handler(request: Request, error: ApiError):
        """Return an intentionally public bounded error."""

        return error_response(error, request.state.request_id)

    @api.exception_handler(SupabaseStoreError)
    async def supabase_store_handler(request: Request, error: SupabaseStoreError):
        """Hide provider response bodies while preserving an explicit unavailable state."""

        del error
        return error_response(
            ApiError(
                503,
                "supabase_unavailable",
                "User data storage is unavailable",
                retryable=True,
            ),
            request.state.request_id,
        )

    @api.exception_handler(PermissionError)
    async def permission_handler(request: Request, error: PermissionError):
        """Normalize cross-user store rejections without revealing identifiers."""

        del error
        return error_response(
            ApiError(403, "forbidden", "The requested resource is not available to this user"),
            request.state.request_id,
        )

    @api.exception_handler(Exception)
    async def unexpected_handler(request: Request, error: Exception):
        """Return no stack/provider/input detail for unexpected failures."""

        logger.error(
            "unhandled_api_error request_id=%s error_type=%s",
            request.state.request_id,
            type(error).__name__,
        )
        return error_response(
            ApiError(500, "internal_error", "The local backend could not complete the request"),
            request.state.request_id,
        )

    async def require_user(
        authorization: str | None = Header(default=None),
        x_student_id: str | None = Header(default=None),
    ) -> AuthenticatedUser:
        """Delegate every private endpoint to the central bearer authenticator."""

        return await authenticator.authenticate(authorization, x_student_id)

    def manager_for(identity: AuthenticatedUser) -> ContextManager:
        if context_manager is not None:
            return context_manager
        if context_manager_factory is not None:
            return context_manager_factory(identity.access_token, identity.user_id)
        store = SupabaseContextStore.from_env(identity.access_token, identity.user_id)
        return ContextManager(config, store=store)

    def download_private_material(identity: AuthenticatedUser, path: str) -> bytes:
        """Fetch one object with the caller's JWT so Storage RLS remains authoritative."""

        expected_prefix = f"{identity.user_id}/"
        if not path.startswith(expected_prefix):
            raise ApiError(403, "forbidden_material", "Material path is not owned by this user")
        url = os.getenv("SUPABASE_URL", "").rstrip("/")
        key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
        if not url or not key:
            raise ApiError(503, "storage_not_configured", "Supabase Storage is not configured")
        if key.startswith("sb_secret_"):
            raise ApiError(
                503,
                "storage_not_configured",
                "SUPABASE_PUBLISHABLE_KEY must not contain a secret key",
            )
        object_path = urllib.parse.quote(path, safe="/")
        request = urllib.request.Request(
            f"{url}/storage/v1/object/authenticated/user-materials/{object_path}",
            headers={"apikey": key, "Authorization": f"Bearer {identity.access_token}"},
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code in {401, 403, 404}:
                raise ApiError(403, "forbidden_material", "Material is not accessible") from error
            raise ApiError(
                503,
                "storage_unavailable",
                "Supabase Storage is unavailable",
                retryable=True,
            ) from error
        except (urllib.error.URLError, TimeoutError) as error:
            raise ApiError(
                503,
                "storage_unavailable",
                "Supabase Storage is unavailable",
                retryable=True,
            ) from error

    @api.get("/health", response_model=LivenessResponse)
    async def health() -> LivenessResponse:
        """Report process liveness without implying model or feature readiness."""

        return LivenessResponse(
            version="0.3.0",
            uptime_s=round(monotonic() - started),
            checked_at=datetime.now(UTC).isoformat(),
        )

    @api.get("/ready", response_model=ReadinessResponse)
    async def readiness() -> JSONResponse:
        """Report minimal model-dependent readiness separately from liveness."""

        status = await llm.status()
        ready = status["reachable"] is True
        payload = ReadinessResponse(
            status="ready" if ready else "not_ready",
            checks={
                "model_runtime": ReadinessCheck(
                    ready=ready,
                    code="ready" if ready else "model_unavailable",
                )
            },
            checked_at=datetime.now(UTC).isoformat(),
        )
        return JSONResponse(status_code=200 if ready else 503, content=payload.model_dump())

    @api.post("/api/system/capability")
    async def system_capability(
        body: CapabilityRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, object]:
        """Measure the local host and recommend only an allowed reviewed model."""

        del identity
        allowed = [model_id for model_id in body.model_catalog if model_id in MODEL_REGISTRY]
        active_processes = int(bool(runtime and runtime.process and runtime.process.poll() is None))
        return probe.report(
            allowed,
            active_users=coordinator.active_user_count,
            active_processes=active_processes,
        )

    @api.post("/api/system/model/recommendation")
    async def model_recommendation(
        body: CapabilityRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, object]:
        """Return the same stable recommendation used by the capability report."""

        del identity
        allowed = [model_id for model_id in body.model_catalog if model_id in MODEL_REGISTRY]
        return probe.recommendation(probe.measure(), allowed)

    @api.post("/api/system/admission/check")
    async def admission_check(
        body: AdmissionCheckRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Issue or renew a caller-scoped capacity lease."""

        return await coordinator.admit(identity.user_id, body.preferred_model_id, body.policy)

    @api.get("/api/system/health")
    async def system_health(
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Return local resource health without exposing other user identities."""

        return await coordinator.health(identity.user_id, {"max_active_users": 10})

    @api.post("/api/system/session/heartbeat")
    async def session_heartbeat(
        body: LeaseRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, bool]:
        """Renew only a lease owned by the authenticated caller."""

        return {"alive": await coordinator.heartbeat(identity.user_id, body.lease_id)}

    @api.post("/api/system/runtime/release")
    async def runtime_release(
        body: ReleaseRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, object]:
        """Release caller-owned leases; missing and foreign leases are indistinguishable."""

        released = await coordinator.release(identity.user_id, body.lease_id)
        return {"released": released, "message_code": "released" if released else "not_found"}

    @api.post("/api/model/prepare")
    async def prepare_model(
        body: ModelPrepareRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Start or join explicit local acquisition and preparation."""

        return await coordinator.prepare(
            identity.user_id,
            body.model_id,
            body.admission_policy.model_dump(),
            body.runtime_floors.model_dump(),
            authorize_download=True,
            deduplicate_downloads=body.deduplicate_downloads,
        )

    @api.get("/api/model/operation/{operation_id}")
    async def model_operation(
        operation_id: str,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Poll a caller-authorized operation without revealing foreign IDs."""

        operation = await coordinator.operation(identity.user_id, operation_id)
        if operation is None:
            raise ApiError(404, "operation_not_found", "Model operation is unavailable")
        return operation

    @api.get("/api/model/status")
    async def model_status(
        model_id: str | None = None,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Expose the active generation and embedding model configuration."""

        if model_id is not None:
            return await coordinator.prepare(
                identity.user_id,
                model_id,
                {
                    "gpu_free_percent": 50,
                    "ram_free_percent": 50,
                    "storage_free_percent": 50,
                },
                {
                    "gpu_free_percent": 30,
                    "ram_free_percent": 25,
                    "storage_free_percent": 30,
                },
                authorize_download=False,
            )
        status = await llm.status()
        status["embedding_model"] = (
            context_manager.embedder.model_name
            if context_manager is not None
            else config.embedding.model
            or f"hashing-fallback-{config.embedding.fallback_dimensions}d"
        )
        return status

    @api.post("/api/context/compile")
    async def compile_context(
        body: CompileRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Compile context for debugging or external orchestration without inference."""

        manager = manager_for(identity)
        compiled = await manager.build_context(
            student_id=identity.user_id,
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
        body: ChatRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Compile bounded context, ask local Qwen, then persist reusable memory."""

        manager = manager_for(identity)
        if body.stream:
            raise ApiError(
                400,
                "streaming_not_supported",
                "The local chat endpoint currently requires stream=false",
            )
        retrieval_subject = body.component_subject_id or body.subject_id
        compiled = await manager.build_context(
            student_id=identity.user_id,
            conversation_id=body.thread_id,
            user_message=body.question,
            subject=retrieval_subject,
            language=body.language,
            material_ids=body.material_ids,
            allow_web=body.allow_web,
            model_config=ModelConfig(model=llm.model),
        )
        result = await llm.complete(compiled)
        message_id = str(uuid.uuid4())
        await manager.process_response(
            student_id=identity.user_id,
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
        body: EventRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Persist a learning event for later progress-aware retrieval."""

        manager = manager_for(identity)
        event = manager.record_event(student_id=identity.user_id, event=body.model_dump())
        return {"event_id": event.id, "created_at": event.occurred_at.isoformat()}

    @api.post("/api/context/artifacts")
    async def create_artifact(
        body: ArtifactRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Persist a reusable context artifact."""

        manager = manager_for(identity)
        artifact = manager.artifacts.create(student_id=identity.user_id, **body.model_dump())
        return artifact.to_dict()

    @api.post("/api/context/documents/text")
    async def ingest_text(
        body: TextDocumentRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Chunk, embed, and index operator-provided text material."""

        manager = manager_for(identity)
        ingestor = DocumentIngestor(manager.store, manager.counter, manager.embedder)
        chunks = await ingestor.ingest_text(student_id=identity.user_id, **body.model_dump())
        return {
            "document_id": chunks[0].document_id,
            "chunks_indexed": len(chunks),
            "token_count": sum(chunk.token_count for chunk in chunks),
        }

    @api.post("/api/context/documents/storage")
    async def ingest_storage_document(
        body: StorageDocumentRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Temporarily parse a private object and persist only its user-scoped chunks."""

        payload = await asyncio.to_thread(download_private_material, identity, body.storage_path)
        suffix = Path(body.original_filename).suffix.casefold()
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
                temporary.write(payload)
                temporary_path = Path(temporary.name)
            manager = manager_for(identity)
            ingestor = DocumentIngestor(manager.store, manager.counter, manager.embedder)
            chunks = await ingestor.ingest_file(
                temporary_path,
                student_id=identity.user_id,
                document_id=body.document_id,
                title=body.title,
                subject=body.subject,
                document_type=body.document_type,
                source=f"supabase://user-materials/{body.storage_path}",
                section=body.section,
                topic=body.topic,
                language=body.language,
                metadata=body.metadata | {"storage_path": body.storage_path},
            )
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
        return {
            "document_id": body.document_id,
            "chunks_indexed": len(chunks),
            "token_count": sum(chunk.token_count for chunk in chunks),
        }

    return api


app = create_app()
