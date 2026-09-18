"""Focused tests for Prompt 03 auth, transport, config, cancellation, and fixtures."""

from __future__ import annotations

import asyncio
import base64
import json
import time
import unittest
from pathlib import Path

from app.auth import (
    BearerAuthenticator,
    SupabaseAccessTokenVerifier,
    TokenVerificationError,
)
from app.config import CONTRACT_VERSION, BackendSettings, ConfigurationError
from app.context.config import ContextConfig
from app.context.manager import ContextManager
from app.context.store import SQLiteContextStore
from app.main import create_app
from app.services.llm import LocalOpenAICompatibleClient
from httpx import ASGITransport, AsyncClient, MockTransport, Request, Response

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "tests/contracts/local-backend-v1.json"


def token(claims: dict[str, object]) -> str:
    """Build an unsigned token-shaped fixture for pre-verification negative tests."""

    encode = lambda value: (
        base64.urlsafe_b64encode(json.dumps(value).encode("utf-8"))
        .decode("ascii")
        .rstrip("=")
    )
    return f"{encode({'alg': 'none'})}.{encode(claims)}.signature"


class StaticVerifier:
    """Return one configured verified claim set or reject the token."""

    def __init__(self, claims: dict[str, object] | None = None) -> None:
        self.claims = claims or {"sub": "user-a"}

    def verify(self, value: str):
        if value == "expired":
            raise TokenVerificationError("expired test detail")
        return self.claims


class ErrorModel:
    """Expose healthy status, then raise a private-detail failure during completion."""

    model = "fake-local-model"

    async def status(self):
        return {"reachable": True, "provider": "test", "model": self.model}

    async def complete(self, _context):
        raise RuntimeError("private-token raw-question /private/model/path")


class AuthAndConfigTests(unittest.IsolatedAsyncioTestCase):
    """Exercise central auth and fail-fast network configuration."""

    async def test_central_auth_rejects_missing_expired_and_conflicting_identity(
        self,
    ) -> None:
        authenticator = BearerAuthenticator(StaticVerifier())
        with self.assertRaisesRegex(Exception, "valid Supabase bearer"):
            await authenticator.authenticate(None, None)
        with self.assertRaisesRegex(Exception, "invalid"):
            await authenticator.authenticate("Bearer expired", None)
        with self.assertRaisesRegex(Exception, "does not match"):
            await authenticator.authenticate("Bearer valid", "user-b")

        identity = await authenticator.authenticate("Bearer valid", "user-a")
        self.assertEqual(identity.user_id, "user-a")
        self.assertEqual(identity.access_token, "valid")

    def test_supabase_verifier_rejects_malformed_expired_and_wrong_project_without_network(
        self,
    ) -> None:
        verifier = SupabaseAccessTokenVerifier(
            "https://project.supabase.co", "sb_publishable_fixture"
        )
        with self.assertRaises(TokenVerificationError):
            verifier.verify("not-a-jwt")
        with self.assertRaisesRegex(TokenVerificationError, "expired"):
            verifier.verify(
                token(
                    {
                        "iss": "https://project.supabase.co/auth/v1",
                        "aud": "authenticated",
                        "sub": "user-a",
                        "exp": time.time() - 1,
                    }
                )
            )
        with self.assertRaisesRegex(TokenVerificationError, "different"):
            verifier.verify(
                token(
                    {
                        "iss": "https://other.supabase.co/auth/v1",
                        "aud": "authenticated",
                        "sub": "user-a",
                        "exp": time.time() + 60,
                    }
                )
            )

    def test_config_defaults_are_loopback_and_unsafe_values_fail_fast(self) -> None:
        settings = BackendSettings.from_env({})
        self.assertEqual(settings.bind_host, "127.0.0.1")
        self.assertEqual(settings.bind_port, 8001)
        self.assertEqual(settings.contract_version, CONTRACT_VERSION)
        self.assertTrue(
            all(
                "localhost" in value or "127.0.0.1" in value
                for value in settings.allowed_origins
            )
        )

        with self.assertRaisesRegex(ConfigurationError, "Non-loopback binding"):
            BackendSettings.from_env({"ALIM_BACKEND_HOST": "0.0.0.0"})
        with self.assertRaisesRegex(ConfigurationError, "Wildcard CORS"):
            BackendSettings.from_env({"ALIM_CORS_ALLOWED_ORIGINS": "*"})
        with self.assertRaisesRegex(ConfigurationError, "Lovable"):
            BackendSettings.from_env(
                {
                    "ALIM_CORS_ALLOWED_ORIGINS": "https://preview.lovable.app",
                    "ALIM_ALLOW_REMOTE_FRONTEND_ORIGINS": "true",
                }
            )


class ContractBoundaryTests(unittest.IsolatedAsyncioTestCase):
    """Prove caller-token propagation, redaction, and cancellation behavior."""

    async def asyncSetUp(self) -> None:
        self.stores: list[SQLiteContextStore] = []

    async def asyncTearDown(self) -> None:
        for store in self.stores:
            store.close()

    def manager(self) -> ContextManager:
        store = SQLiteContextStore()
        self.stores.append(store)
        return ContextManager(ContextConfig(), store=store)

    async def test_context_factory_receives_exact_verified_caller_token_and_subject(
        self,
    ) -> None:
        captured: list[tuple[str, str]] = []
        manager = self.manager()

        def factory(access_token: str, user_id: str) -> ContextManager:
            captured.append((access_token, user_id))
            return manager

        app = create_app(
            llm_client=ErrorModel(),
            auth_verifier=StaticVerifier(),
            context_manager_factory=factory,
        )
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            response = await client.post(
                "/api/context/events",
                headers={"Authorization": "Bearer exact-caller-token"},
                json={"event_type": "study_session", "content": "bounded fixture"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured, [("exact-caller-token", "user-a")])

    async def test_unexpected_failures_use_stable_redacted_error_envelope(self) -> None:
        app = create_app(
            self.manager(),
            ErrorModel(),
            auth_verifier=StaticVerifier(),
        )
        async with AsyncClient(
            transport=ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://127.0.0.1",
        ) as client:
            response = await client.post(
                "/api/chat",
                headers={"Authorization": "Bearer caller-secret"},
                json={
                    "thread_id": "thread-a",
                    "question": "raw-question",
                    "allow_web": False,
                },
            )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "internal_error")
        self.assertNotIn("caller-secret", response.text)
        self.assertNotIn("raw-question", response.text)
        self.assertNotIn("private", response.text)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["x-alim-contract-version"], CONTRACT_VERSION)

    async def test_request_cancellation_reaches_async_model_work(self) -> None:
        started = asyncio.Event()
        cancelled = asyncio.Event()

        async def handler(_request: Request) -> Response:
            started.set()
            try:
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                cancelled.set()
                raise
            return Response(200, json={"data": []})

        model = LocalOpenAICompatibleClient(transport=MockTransport(handler))
        task = asyncio.create_task(model.status())
        await asyncio.wait_for(started.wait(), timeout=2)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        await asyncio.wait_for(cancelled.wait(), timeout=2)

    def test_contract_fixture_matches_implemented_route_set(self) -> None:
        fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
        app = create_app(self.manager(), ErrorModel(), auth_verifier=StaticVerifier())
        actual = {
            (method, route.path)
            for route in app.routes
            for method in getattr(route, "methods", set())
            if route.path in {item["path"] for item in fixture["implemented_routes"]}
        }
        expected = {
            (item["method"], item["path"]) for item in fixture["implemented_routes"]
        }
        self.assertEqual(actual, expected)
        self.assertEqual(fixture["contract_version"], CONTRACT_VERSION)


if __name__ == "__main__":
    unittest.main()
