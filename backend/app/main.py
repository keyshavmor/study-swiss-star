"""FastAPI application exposing Alim's local context and Qwen chat services."""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
import weakref
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
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
from .assessment import (
    AbandonRequest,
    AssessmentRepository,
    AssessmentService,
    CreateGenerationRequest,
    NullAssessmentPublicStore,
    SubmitAssessmentRequest,
    SupabaseAssessmentStore,
)
from .auth import AccessTokenVerifier, AuthenticatedUser, BearerAuthenticator
from .config import BackendSettings
from .context import ContextConfig, ContextManager
from .context.budget import ContextBudgetError
from .context.models import ModelConfig
from .context.retrieval import EmbeddingUnavailableError
from .context.store_supabase import SupabaseContextStore, SupabaseStoreError
from .contracts import LivenessResponse, ReadinessCheck, ReadinessResponse
from .errors import ApiError, error_response
from .model_registry import MODEL_REGISTRY, MappingState, model_cache_root, resolve_model
from .runtime_control import RuntimeCoordinator
from .services import (
    MAX_MATERIAL_BYTES,
    DocumentIngestor,
    LocalOpenAICompatibleClient,
    ModelRuntimeManager,
    ModelUnavailableError,
    UnsupportedDocumentError,
    stable_text_document_id,
)
from .system_probe import SystemProbe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alim.api")

SupportedLanguage = Literal["en", "de", "gsw", "ru", "es", "fr", "it"]
SafetyModerator = Callable[[AuthenticatedUser, str], Awaitable[str]]


def _validate_owner_storage_path(user_id: str, path: str) -> None:
    """Reject traversal and require the verified owner as the first path segment."""

    if "\\" in path or path.startswith("/"):
        raise ApiError(403, "forbidden_material", "Material path is not owned by this user")
    parts = PurePosixPath(path).parts
    if len(parts) < 2 or parts[0] != user_id or any(part in {"", ".", ".."} for part in parts):
        raise ApiError(403, "forbidden_material", "Material path is not owned by this user")


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
    user_message_id: str = Field(min_length=1, max_length=200)
    question: str = Field(min_length=1, max_length=4_000)
    model_id: str | None = Field(default=None, min_length=1, max_length=200)
    subject_id: str | None = None
    component_subject_id: str | None = None
    ui_language: SupportedLanguage | None = None
    language: SupportedLanguage | None = None
    academic_year: str | None = None
    grade_level: int | None = None
    learning_goal_id: str | None = None
    material_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=6, ge=1, le=20)
    include_sources: bool = True
    stream: bool = False
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

    title: str = Field(min_length=1, max_length=240)
    subject: str = Field(min_length=1, max_length=120)
    document_type: str = Field(min_length=1, max_length=80)
    content: str = Field(min_length=1, max_length=5_000_000)
    source: str | None = None
    topic: str | None = None
    subtopic: str | None = None
    section: str | None = None
    chapter: str | None = None
    language: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StorageDocumentRequest(BaseModel):
    """A private Supabase Storage object to download temporarily and index locally."""

    document_id: str = Field(min_length=1, max_length=200)
    storage_path: str = Field(min_length=1, max_length=1_024)
    original_filename: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=240)
    subject: str = Field(min_length=1, max_length=120)
    document_type: str = Field(min_length=1, max_length=80)
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


class PrivacyPurgeRequest(BaseModel):
    """Caller-scoped local half of the data-deletion workflow."""

    mode: Literal["range", "all_content", "delete_account"]
    start_at: str | None = Field(default=None, max_length=64)
    end_at: str | None = Field(default=None, max_length=64)
    delete_peer_messages: bool = True
    delete_ai_messages: bool = True


def _privacy_range(body: PrivacyPurgeRequest) -> tuple[datetime | None, datetime | None]:
    """Validate the same half-open ISO-8601 range accepted by delete-my-data."""

    if body.mode != "range":
        return None, None
    if not body.start_at or not body.end_at:
        raise ApiError(400, "invalid_range", "A valid deletion range is required")
    try:
        start = datetime.fromisoformat(body.start_at)
        end = datetime.fromisoformat(body.end_at)
    except ValueError as error:
        raise ApiError(400, "invalid_range", "A valid deletion range is required") from error
    if start.tzinfo is None or end.tzinfo is None or start >= end:
        raise ApiError(400, "invalid_range", "A valid deletion range is required")
    return start.astimezone(UTC), end.astimezone(UTC)


def create_app(
    context_manager: ContextManager | None = None,
    llm_client: LocalOpenAICompatibleClient | None = None,
    runtime_manager: ModelRuntimeManager | None = None,
    auth_verifier: AccessTokenVerifier | None = None,
    context_manager_factory: Callable[[str, str], ContextManager] | None = None,
    settings: BackendSettings | None = None,
    runtime_coordinator: RuntimeCoordinator | None = None,
    safety_moderator: SafetyModerator | None = None,
    assessment_service: AssessmentService | None = None,
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
    chat_locks: weakref.WeakValueDictionary[str, asyncio.Lock] = weakref.WeakValueDictionary()
    chat_locks_guard = asyncio.Lock()
    assessment = assessment_service
    owned_assessment_repository = False

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
            if assessment is not None:
                await assessment.shutdown()
                if owned_assessment_repository:
                    assessment.repository.close()
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

    @api.exception_handler(UnsupportedDocumentError)
    async def unsupported_document_handler(request: Request, error: UnsupportedDocumentError):
        """Return a stable content/type failure without exposing parser internals."""

        del error
        return error_response(
            ApiError(415, "unsupported_document", "The document type or content is unsupported"),
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

    if assessment is None:
        assessment_database: str | Path = ":memory:"
        if production_runtime:
            assessment_database = Path(
                os.getenv(
                    "ALIM_ASSESSMENT_DB",
                    str(config.database_path.parent / "alim-assessments.db"),
                )
            )
        repository = AssessmentRepository(assessment_database)
        owned_assessment_repository = True
        assessment = AssessmentService(
            repository=repository,
            llm=llm,
            context_factory=manager_for,
            public_store_factory=(
                lambda identity: (
                    SupabaseAssessmentStore.from_env(identity.access_token, identity.user_id)
                    if production_runtime
                    else NullAssessmentPublicStore()
                )
            ),
            safety_moderator=safety_moderator,
            enforce_registry=production_runtime,
        )

    def download_private_material(identity: AuthenticatedUser, path: str) -> bytes:
        """Fetch one object with the caller's JWT so Storage RLS remains authoritative."""

        _validate_owner_storage_path(identity.user_id, path)
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
                announced = response.headers.get("Content-Length")
                if announced is not None:
                    try:
                        announced_bytes = int(announced)
                    except ValueError as error:
                        raise ApiError(
                            503,
                            "storage_invalid_response",
                            "Supabase Storage returned an invalid response",
                            retryable=True,
                        ) from error
                    if announced_bytes > MAX_MATERIAL_BYTES:
                        raise ApiError(
                            413,
                            "material_too_large",
                            "Material exceeds the 50 MiB ingestion limit",
                        )
                payload = bytearray()
                while True:
                    block = response.read(min(64 * 1024, MAX_MATERIAL_BYTES + 1 - len(payload)))
                    if not block:
                        break
                    payload.extend(block)
                    if len(payload) > MAX_MATERIAL_BYTES:
                        raise ApiError(
                            413,
                            "material_too_large",
                            "Material exceeds the 50 MiB ingestion limit",
                        )
                return bytes(payload)
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

    async def lock_for_chat(key: str) -> asyncio.Lock:
        """Serialize duplicate message IDs without retaining an unbounded lock registry."""

        async with chat_locks_guard:
            lock = chat_locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                chat_locks[key] = lock
            return lock

    def chat_fingerprint(body: ChatRequest) -> str:
        """Hash the semantic request so one idempotency key cannot change meaning."""

        value = body.model_dump(exclude={"user_message_id"}, mode="json")
        encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def assistant_message_id(identity: AuthenticatedUser, body: ChatRequest) -> str:
        """Derive a stable assistant row ID from verified scope and the user turn ID."""

        return str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"alim-chat-assistant|{identity.user_id}|{body.thread_id}|{body.user_message_id}",
            )
        )

    def cached_chat_response(
        messages: list[Any], message_id: str, fingerprint: str, thread_id: str
    ) -> dict[str, Any] | None:
        """Rehydrate a completed response only when its exact request fingerprint matches."""

        existing = next((message for message in messages if message.id == message_id), None)
        if existing is None:
            return None
        if (
            existing.role != "assistant"
            or existing.metadata.get("request_fingerprint") != fingerprint
        ):
            raise ApiError(
                409,
                "idempotency_conflict",
                "The message identifier was already used for another request",
            )
        metadata = existing.metadata.get("chat_response")
        if not isinstance(metadata, dict):
            raise ApiError(
                409,
                "idempotency_conflict",
                "The previous response cannot be safely replayed",
            )
        return {
            "thread_id": thread_id,
            "message_id": message_id,
            "answer": existing.content,
            **metadata,
        }

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

    @api.post("/api/privacy/purge-local")
    async def purge_local_user_data(
        body: PrivacyPurgeRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, object]:
        """Idempotently purge caller-owned local state before Supabase deletion."""

        start, end = _privacy_range(body)
        deleted = 0
        runtime_references = 0
        if body.mode != "range" or body.delete_ai_messages:
            manager = manager_for(identity)
            deleted += manager.store.purge_user_data(
                identity.user_id,
                start=start,
                end=end,
            )
            deleted += await assessment.purge_user_data(
                identity.user_id,
                start=start,
                end=end,
            )
        if body.mode != "range":
            runtime_references = await coordinator.purge_user_references(identity.user_id)
        return {
            "ok": True,
            "mode": body.mode,
            "deleted_local_records": deleted,
            "removed_runtime_references": runtime_references,
        }

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
        """Generate one safe, ready, user-scoped and idempotently persisted chat turn."""

        manager = manager_for(identity)
        if body.stream:
            raise ApiError(
                400,
                "streaming_not_supported",
                "The local chat endpoint currently requires stream=false",
            )
        if not manager.store.conversation_owned(identity.user_id, body.thread_id):
            raise ApiError(404, "thread_not_found", "The study thread is unavailable")

        message_id = assistant_message_id(identity, body)
        fingerprint = chat_fingerprint(body)
        lock = await lock_for_chat(f"{identity.user_id}|{body.thread_id}|{body.user_message_id}")
        async with lock:
            messages = manager.store.list_messages(identity.user_id, body.thread_id)
            if manager.store.canonical_transcript:
                stored_user = next(
                    (message for message in messages if message.id == body.user_message_id),
                    None,
                )
                if (
                    stored_user is None
                    or stored_user.role != "user"
                    or stored_user.content != body.question
                ):
                    raise ApiError(
                        409,
                        "idempotency_conflict",
                        "The user message identifier does not match the persisted request",
                    )
            cached = cached_chat_response(messages, message_id, fingerprint, body.thread_id)
            if cached is not None:
                return cached

            if safety_moderator is None:
                raise ApiError(
                    503,
                    "safety_unavailable",
                    "Content safety is unavailable",
                    retryable=True,
                )
            verdict = await safety_moderator(identity, body.question)
            if verdict != "allow":
                if verdict == "block":
                    raise ApiError(403, "content_blocked", "The request cannot be processed")
                raise ApiError(
                    503,
                    "safety_unavailable",
                    "Content safety is unavailable",
                    retryable=True,
                )

            if body.model_id:
                entry = resolve_model(body.model_id)
                if entry is None or entry.mapping_state is not MappingState.VERIFIED:
                    raise ApiError(
                        409,
                        "model_not_ready",
                        "The selected local model is not ready",
                        retryable=True,
                    )
            status = await llm.status()
            if status.get("reachable") is not True:
                raise ModelUnavailableError("The local model endpoint is unavailable")
            if body.model_id and status.get("model") != body.model_id:
                raise ApiError(
                    409,
                    "model_selection_mismatch",
                    "The ready local model does not match the selected model",
                    retryable=True,
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
                model_config=ModelConfig(model=body.model_id or llm.model),
            )
            result = await llm.complete(compiled)
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
            response_metadata = {
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
                metadata={
                    "request_fingerprint": fingerprint,
                    "chat_response": response_metadata,
                },
            )
            persisted = cached_chat_response(
                manager.store.list_messages(identity.user_id, body.thread_id),
                message_id,
                fingerprint,
                body.thread_id,
            )
            if persisted is None:
                raise ApiError(
                    503,
                    "message_persistence_failed",
                    "The completed answer could not be persisted",
                    retryable=True,
                )
            return persisted

    @api.post("/api/assessments/generation")
    async def create_assessment_generation(
        body: CreateGenerationRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Create or replay one caller-owned local-model generation operation."""

        return await assessment.create_generation(identity, body)

    @api.get("/api/assessments/generation/{job_id}")
    async def assessment_generation_status(
        job_id: str,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Return only public questions after strict validation succeeds."""

        return assessment.status(identity.user_id, job_id)

    @api.post("/api/assessments/generation/{job_id}/cancel")
    async def cancel_assessment_generation(
        job_id: str,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, bool]:
        """Cancel a caller-owned generation task without exposing another owner."""

        return await assessment.cancel(identity.user_id, job_id)

    @api.post("/api/assessments/attempts/{attempt_id}/begin")
    async def begin_assessment(
        attempt_id: str,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, str]:
        """Establish the authoritative server start time and optional deadline."""

        return await assessment.begin(identity, attempt_id)

    @api.post("/api/assessments/attempts/{attempt_id}/heartbeat")
    async def heartbeat_assessment(
        attempt_id: str,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, bool]:
        """Refresh an active attempt without accepting client timing authority."""

        return await assessment.heartbeat(identity.user_id, attempt_id)

    @api.post("/api/assessments/attempts/{attempt_id}/submit")
    async def submit_assessment(
        attempt_id: str,
        body: SubmitAssessmentRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, str]:
        """Validate an immutable snapshot and start server-owned grading."""

        if body.payload.attempt_id != attempt_id:
            raise ApiError(409, "assessment_snapshot_mismatch", "Attempt identifiers differ")
        return await assessment.submit(identity, body)

    @api.post("/api/assessments/abandon")
    async def abandon_assessment(
        body: AbandonRequest,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, bool]:
        """Clean ephemeral private material; submitted results remain immutable."""

        return await assessment.abandon(identity, body)

    @api.get("/api/assessments/attempts/{attempt_id}/grading")
    async def assessment_grading_status(
        attempt_id: str,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Return a caller-owned durable grading state."""

        return assessment.grading_status(identity.user_id, attempt_id)

    @api.get("/api/assessments/attempts/{attempt_id}/result")
    async def assessment_result(
        attempt_id: str,
        identity: AuthenticatedUser = Depends(require_user),  # noqa: B008
    ) -> dict[str, Any]:
        """Return answers/rubrics only after durable grading completes."""

        return assessment.result(identity.user_id, attempt_id)

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
        values = body.model_dump()
        values["document_id"] = stable_text_document_id(
            identity.user_id,
            body.title,
            body.subject,
            body.content,
        )
        chunks = await ingestor.ingest_text(student_id=identity.user_id, **values)
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

        if (
            "\\" in body.original_filename
            or "/" in body.original_filename
            or Path(body.original_filename).name != body.original_filename
        ):
            raise ApiError(400, "invalid_filename", "The material filename is invalid")
        _validate_owner_storage_path(identity.user_id, body.storage_path)
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
