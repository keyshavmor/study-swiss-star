"""FastAPI integration tests using an in-process local-model double."""

from __future__ import annotations

import unittest
from datetime import UTC, datetime, timedelta

from app.auth import TokenVerificationError
from app.context.config import ContextConfig
from app.context.manager import ContextManager
from app.context.models import DocumentChunk
from app.context.store import SQLiteContextStore
from app.main import create_app
from app.runtime_control import RuntimeCoordinator
from app.services.llm import LLMResponse
from httpx import ASGITransport, AsyncClient


class FakeLocalModel:
    """Capture compiled prompts while returning deterministic local answers."""

    model = "fake-local-model"

    def __init__(self):
        self.calls = 0

    async def status(self):
        """Return a healthy local-model status payload."""

        return {
            "provider": "test",
            "model": self.model,
            "endpoint": "in-process",
            "mode": "local",
            "reachable": True,
            "latency_ms": 0,
        }

    async def complete(self, context):
        """Capture context and return a deterministic tutoring answer."""

        self.calls += 1
        self.last_context = context
        return LLMResponse(
            content="Oxidative phosphorylation uses the proton gradient to make ATP.",
            model=self.model,
            latency_ms=1,
        )


class FakeTokenVerifier:
    """Treat deterministic test tokens as verified Supabase subjects."""

    def verify(self, token: str):
        if token == "token-invalid":
            raise TokenVerificationError("invalid test token")
        return {"sub": token.removeprefix("token-")}


async def allow_safe_content(_identity, _text: str) -> str:
    """Deterministic allow verdict for tests that are not testing moderation."""

    return "allow"


class ApiTests(unittest.IsolatedAsyncioTestCase):
    """Exercise health, chat, persistence, and standardized errors through ASGI."""

    async def asyncSetUp(self) -> None:
        """Create an isolated API and local SQLite store for each test."""

        self.store = SQLiteContextStore()
        self.manager = ContextManager(ContextConfig(), store=self.store)
        self.model = FakeLocalModel()
        app = create_app(
            self.manager,
            self.model,
            auth_verifier=FakeTokenVerifier(),
            safety_moderator=allow_safe_content,
            runtime_coordinator=RuntimeCoordinator(state_path=None),
        )
        self.client = AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        )

    async def asyncTearDown(self) -> None:
        """Release HTTP and SQLite resources after each test."""

        await self.client.aclose()
        self.store.close()

    async def test_health_and_chat_use_compiled_context(self) -> None:
        """Health and chat expose local generation with retrieved provenance."""

        content = "Oxidative phosphorylation uses an electron transport chain and proton gradient."
        self.store.add_chunks(
            [
                DocumentChunk(
                    id="chunk-1",
                    document_id="biology-notes",
                    title="Biology Notes",
                    content=content,
                    subject="biology",
                    topic="cellular_respiration",
                    document_type="notes",
                    page=37,
                    token_count=self.manager.counter.count(content),
                )
            ]
        )
        health = await self.client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "ok")
        self.assertNotIn("model_server", health.json())
        self.assertEqual(health.headers["X-Alim-Contract-Version"], "2026-09-18")

        ready = await self.client.get("/ready")
        self.assertEqual(ready.status_code, 200)
        self.assertEqual(ready.json()["status"], "ready")

        response = await self.client.post(
            "/api/chat",
            headers={"Authorization": "Bearer token-student-1"},
            json={
                "thread_id": "thread-1",
                "user_message_id": "user-message-1",
                "question": "Why does oxidative phosphorylation make more ATP than glycolysis?",
                "subject_id": "biology",
                "language": "de",
                "stream": False,
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["used_model"], "fake-local-model")
        self.assertEqual(payload["sources"][0]["page"], 37)
        self.assertEqual(len(self.model.last_context.prompt_messages), 2)
        self.assertIn(
            "Biology Notes", self.model.last_context.prompt_messages[0]["content"]
        )
        self.assertEqual(len(self.store.list_messages("student-1", "thread-1")), 2)

    async def test_streaming_request_returns_standard_error_envelope(self) -> None:
        """Unsupported streaming uses the documented request error schema."""

        response = await self.client.post(
            "/api/chat",
            headers={"Authorization": "Bearer token-student-1"},
            json={
                "thread_id": "thread-1",
                "user_message_id": "user-message-stream",
                "question": "Hello",
                "stream": True,
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "streaming_not_supported")
        self.assertIn("X-Request-Id", response.headers)

    async def test_chat_retry_replays_exact_persisted_answer_once(self) -> None:
        """The user-message ID is a durable idempotency key for one exact answer."""

        request = {
            "thread_id": "thread-retry",
            "user_message_id": "user-message-retry",
            "question": "Explain ATP",
            "language": "en",
            "allow_web": False,
        }
        headers = {"Authorization": "Bearer token-student-1"}
        first = await self.client.post("/api/chat", headers=headers, json=request)
        second = await self.client.post("/api/chat", headers=headers, json=request)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json(), first.json())
        self.assertEqual(self.model.calls, 1)
        messages = self.store.list_messages("student-1", "thread-retry")
        self.assertEqual([message.role for message in messages], ["user", "assistant"])

        conflict = await self.client.post(
            "/api/chat",
            headers=headers,
            json=request | {"question": "A different request"},
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(conflict.json()["error"]["code"], "idempotency_conflict")
        self.assertEqual(self.model.calls, 1)

    async def test_chat_fails_closed_without_safety_or_ready_model(self) -> None:
        """No safety verdict or unreachable runtime can ever produce a canned answer."""

        unsafe_store = SQLiteContextStore()
        unsafe_manager = ContextManager(ContextConfig(), store=unsafe_store)
        unsafe_model = FakeLocalModel()
        unsafe_app = create_app(
            unsafe_manager,
            unsafe_model,
            auth_verifier=FakeTokenVerifier(),
        )
        async with AsyncClient(
            transport=ASGITransport(app=unsafe_app), base_url="http://127.0.0.1"
        ) as client:
            unavailable = await client.post(
                "/api/chat",
                headers={"Authorization": "Bearer token-student-1"},
                json={
                    "thread_id": "thread-closed",
                    "user_message_id": "message-closed",
                    "question": "Explain ATP",
                    "allow_web": False,
                },
            )
        self.assertEqual(unavailable.status_code, 503)
        self.assertEqual(unavailable.json()["error"]["code"], "safety_unavailable")
        self.assertEqual(unsafe_model.calls, 0)
        self.assertEqual(unsafe_store.list_messages("student-1", "thread-closed"), [])
        unsafe_store.close()

        async def block_content(_identity, _text: str) -> str:
            return "block"

        blocked_store = SQLiteContextStore()
        blocked_model = FakeLocalModel()
        blocked_app = create_app(
            ContextManager(ContextConfig(), store=blocked_store),
            blocked_model,
            auth_verifier=FakeTokenVerifier(),
            safety_moderator=block_content,
        )
        async with AsyncClient(
            transport=ASGITransport(app=blocked_app), base_url="http://127.0.0.1"
        ) as client:
            blocked = await client.post(
                "/api/chat",
                headers={"Authorization": "Bearer token-student-1"},
                json={
                    "thread_id": "thread-blocked",
                    "user_message_id": "message-blocked",
                    "question": "blocked fixture",
                    "allow_web": False,
                },
            )
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.json()["error"]["code"], "content_blocked")
        self.assertEqual(blocked_model.calls, 0)
        blocked_store.close()

    async def test_liveness_does_not_claim_model_readiness(self) -> None:
        """A live process remains live when the model-dependent feature is unavailable."""

        self.model.status = lambda: _async_value(
            {
                "provider": "test",
                "model": self.model.model,
                "endpoint": "in-process",
                "mode": "local",
                "reachable": False,
                "latency_ms": 0,
            }
        )
        liveness = await self.client.get("/health")
        readiness = await self.client.get("/ready")
        self.assertEqual(liveness.status_code, 200)
        self.assertEqual(liveness.json()["status"], "ok")
        self.assertEqual(readiness.status_code, 503)
        self.assertEqual(readiness.json()["status"], "not_ready")

    async def test_chat_checks_actual_runtime_readiness_before_retrieval(self) -> None:
        """A stale frontend ready state cannot cause generation when the model is offline."""

        self.model.status = lambda: _async_value(
            {
                "provider": "test",
                "model": self.model.model,
                "endpoint": "in-process",
                "mode": "local",
                "reachable": False,
                "latency_ms": 0,
            }
        )
        response = await self.client.post(
            "/api/chat",
            headers={"Authorization": "Bearer token-student-1"},
            json={
                "thread_id": "thread-offline",
                "user_message_id": "message-offline",
                "question": "Explain ATP",
                "allow_web": False,
            },
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["error"]["code"], "model_unavailable")
        self.assertEqual(self.model.calls, 0)
        self.assertEqual(self.store.list_messages("student-1", "thread-offline"), [])

    async def test_model_status_is_private(self) -> None:
        """Model diagnostics use the same bearer boundary as other private routes."""

        missing = await self.client.get("/api/model/status")
        self.assertEqual(missing.status_code, 401)
        allowed = await self.client.get(
            "/api/model/status",
            headers={"Authorization": "Bearer token-student-1"},
        )
        self.assertEqual(allowed.status_code, 200)

    async def test_private_endpoints_require_auth_and_reject_spoofed_student_header(
        self,
    ) -> None:
        """A legacy header cannot replace or override the verified JWT subject."""

        missing = await self.client.post(
            "/api/context/events",
            json={"event_type": "study_session", "content": "Reviewed meiosis"},
        )
        self.assertEqual(missing.status_code, 401)

        spoofed = await self.client.post(
            "/api/context/events",
            headers={
                "Authorization": "Bearer token-user-a",
                "X-Student-Id": "user-b",
            },
            json={"event_type": "study_session", "content": "Reviewed meiosis"},
        )
        self.assertEqual(spoofed.status_code, 403)
        self.assertEqual(spoofed.json()["error"]["code"], "student_id_mismatch")

        invalid = await self.client.post(
            "/api/context/events",
            headers={"Authorization": "Bearer token-invalid"},
            json={"event_type": "study_session", "content": "Reviewed meiosis"},
        )
        self.assertEqual(invalid.status_code, 401)
        self.assertEqual(invalid.json()["error"]["code"], "invalid_token")

        matching = await self.client.post(
            "/api/context/events",
            headers={
                "Authorization": "Bearer token-user-a",
                "X-Student-Id": "user-a",
            },
            json={"event_type": "study_session", "content": "Reviewed meiosis"},
        )
        self.assertEqual(matching.status_code, 200)

    async def test_privacy_purge_is_authenticated_owner_scoped_and_idempotent(
        self,
    ) -> None:
        """Local deletion removes only caller data before the Supabase stage runs."""

        for user in ("user-a", "user-b"):
            created = await self.client.post(
                "/api/context/events",
                headers={"Authorization": f"Bearer token-{user}"},
                json={"event_type": "study_session", "content": f"private {user}"},
            )
            self.assertEqual(created.status_code, 200)

        missing = await self.client.post(
            "/api/privacy/purge-local", json={"mode": "all_content"}
        )
        self.assertEqual(missing.status_code, 401)

        headers = {"Authorization": "Bearer token-user-a", "X-Student-Id": "user-a"}
        first = await self.client.post(
            "/api/privacy/purge-local",
            headers=headers,
            json={"mode": "all_content"},
        )
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["ok"])
        self.assertGreaterEqual(first.json()["deleted_local_records"], 1)
        self.assertEqual(self.store.list_events("user-a"), [])
        self.assertEqual(len(self.store.list_events("user-b")), 1)

        repeated = await self.client.post(
            "/api/privacy/purge-local",
            headers=headers,
            json={"mode": "all_content"},
        )
        self.assertEqual(repeated.status_code, 200)
        self.assertEqual(repeated.json()["deleted_local_records"], 0)

    async def test_privacy_range_requires_ordered_timezone_aware_bounds(self) -> None:
        headers = {"Authorization": "Bearer token-user-a"}
        for payload in (
            {"mode": "range"},
            {
                "mode": "range",
                "start_at": "2026-01-02T00:00:00Z",
                "end_at": "2026-01-01T00:00:00Z",
            },
            {
                "mode": "range",
                "start_at": "2026-01-01T00:00:00",
                "end_at": "2026-01-02T00:00:00",
            },
        ):
            with self.subTest(payload=payload):
                response = await self.client.post(
                    "/api/privacy/purge-local", headers=headers, json=payload
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()["error"]["code"], "invalid_range")

    async def test_privacy_range_honours_ai_selection_and_half_open_bounds(self) -> None:
        headers = {"Authorization": "Bearer token-user-a"}
        created = await self.client.post(
            "/api/context/events",
            headers=headers,
            json={"event_type": "study_session", "content": "range-owned event"},
        )
        self.assertEqual(created.status_code, 200)
        now = datetime.now(UTC)
        body = {
            "mode": "range",
            "start_at": (now - timedelta(minutes=1)).isoformat(),
            "end_at": (now + timedelta(minutes=1)).isoformat(),
            "delete_peer_messages": True,
            "delete_ai_messages": False,
        }
        peer_only = await self.client.post(
            "/api/privacy/purge-local", headers=headers, json=body
        )
        self.assertEqual(peer_only.status_code, 200)
        self.assertEqual(peer_only.json()["deleted_local_records"], 0)
        self.assertEqual(len(self.store.list_events("user-a")), 1)

        with_ai = await self.client.post(
            "/api/privacy/purge-local",
            headers=headers,
            json=body | {"delete_ai_messages": True},
        )
        self.assertEqual(with_ai.status_code, 200)
        self.assertEqual(with_ai.json()["deleted_local_records"], 1)
        self.assertEqual(self.store.list_events("user-a"), [])

    async def test_storage_ingestion_rejects_owner_prefix_traversal_before_download(
        self,
    ) -> None:
        response = await self.client.post(
            "/api/context/documents/storage",
            headers={"Authorization": "Bearer token-student-1"},
            json={
                "document_id": "document-a",
                "storage_path": "student-1/../student-2/private.pdf",
                "original_filename": "private.pdf",
                "title": "Private",
                "subject": "biology",
                "document_type": "pdf",
            },
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "forbidden_material")

    async def test_all_supported_response_languages_reach_the_compiler(self) -> None:
        for language in ("en", "de", "gsw", "ru", "es", "fr", "it"):
            with self.subTest(language=language):
                response = await self.client.post(
                    "/api/chat",
                    headers={"Authorization": "Bearer token-student-1"},
                    json={
                        "thread_id": f"thread-{language}",
                        "user_message_id": f"user-message-{language}",
                        "question": "Explain this concept",
                        "language": language,
                        "allow_web": False,
                        "stream": False,
                    },
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["language"], language)
                self.assertIn(
                    "Response language:",
                    self.model.last_context.prompt_messages[0]["content"],
                )

        unsupported = await self.client.post(
            "/api/chat",
            headers={"Authorization": "Bearer token-student-1"},
            json={
                "thread_id": "thread-unsupported",
                "user_message_id": "user-message-unsupported",
                "question": "Explain this concept",
                "language": "xx",
                "allow_web": False,
                "stream": False,
            },
        )
        self.assertEqual(unsupported.status_code, 422)
        self.assertEqual(
            unsupported.json()["error"]["message"], "Request validation failed"
        )
        self.assertNotIn("xx", unsupported.text)

    async def test_cors_is_explicitly_local_and_denies_unlisted_origins(self) -> None:
        """Credentialed CORS never uses a wildcard or a hosted preview origin."""

        allowed = await self.client.options(
            "/api/chat",
            headers={
                "Origin": "http://127.0.0.1:8080",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization,Content-Type,X-Student-Id",
            },
        )
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(
            allowed.headers["access-control-allow-origin"], "http://127.0.0.1:8080"
        )

        denied = await self.client.options(
            "/api/chat",
            headers={
                "Origin": "https://preview.example.invalid",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(denied.status_code, 400)
        self.assertNotIn("access-control-allow-origin", denied.headers)


async def _async_value(value):
    return value


if __name__ == "__main__":
    unittest.main()
