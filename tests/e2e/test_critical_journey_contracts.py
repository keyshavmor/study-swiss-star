"""Offline Prompt 09 cross-layer traceability and transport-contract gates.

These tests deliberately do not impersonate a browser, physical accelerator, or
hosted Supabase project. They prove that every shipped route and local endpoint
has named executable evidence and that the private API boundary fails closed.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from app.context import ContextConfig, ContextManager
from app.context.store import SQLiteContextStore
from app.main import create_app
from app.runtime_control import RuntimeCoordinator
from httpx import ASGITransport, AsyncClient

ROOT = Path(__file__).resolve().parents[2]
TRACEABILITY = ROOT / "tests/contracts/feature-traceability.json"
API_FIXTURE = ROOT / "tests/contracts/local-backend-v1.json"


class OfflineModel:
    """Truthful unavailable model used before any private handler can execute."""

    model = "offline-fixture"

    async def status(self):
        return {"reachable": False, "model": self.model}


class CriticalJourneyTraceabilityTests(unittest.TestCase):
    def test_every_shipped_screen_and_api_route_has_owned_evidence(self) -> None:
        matrix = json.loads(TRACEABILITY.read_text(encoding="utf-8"))
        required = {
            "auth_and_password_recovery",
            "language_onboarding",
            "model_selection_or_skip",
            "compliance_and_suspension",
            "authenticated_shell_and_home",
            "school_subjects_and_materials",
            "study_chat",
            "assistant_and_attachments",
            "assessments",
            "planner_and_calendar",
            "statistics",
            "profile",
            "settings_privacy_and_quota",
            "feedback",
            "peer_messaging",
            "help",
            "system_health",
        }
        journeys = {item["id"]: item for item in matrix["journeys"]}
        self.assertTrue(required <= journeys.keys())

        covered_routes: set[str] = set()
        for journey in journeys.values():
            self.assertTrue(journey["controls"], journey["id"])
            self.assertIn(
                journey["classification"],
                {
                    "supabase_managed_no_local_ai",
                    "browser_local_static",
                    "frontend_session_plus_supabase_preference",
                    "local_ai_optional",
                    "mixed_non_ai_shell",
                    "mixed_browser_supabase_local_ingestion",
                    "local_ai_with_supabase_transcript",
                    "supabase_persistence_generation_unsupported",
                    "local_ai_private_ephemeral_plus_supabase_snapshot",
                    "supabase_reads_send_fail_closed",
                    "browser_supabase_external_no_local_ai",
                    "browser_local_no_ai",
                    "mixed_supabase_and_local_privacy",
                    "supabase_edge_no_local_ai",
                    "mixed_observability",
                },
            )
            for layer in ("routes", "frontend", "backend", "supabase", "e2e"):
                for relative in journey[layer]:
                    self.assertTrue(
                        (ROOT / relative).is_file(), f"{journey['id']}: {relative}"
                    )
            self.assertTrue(journey["frontend"], journey["id"])
            self.assertTrue(journey["e2e"], journey["id"])
            self.assertTrue(journey["manual"], journey["id"])
            covered_routes.update(journey["routes"])

        shipped = {
            path.relative_to(ROOT).as_posix()
            for path in (ROOT / "frontend/src/routes").glob("**/*.tsx")
        }
        shipped.add("frontend/src/routes/api/chat.ts")
        self.assertEqual(covered_routes, shipped)

    def test_traceability_contains_no_false_physical_host_claim(self) -> None:
        text = TRACEABILITY.read_text(encoding="utf-8").casefold()
        self.assertIn("physical accelerator", text)
        self.assertIn("not authorized", text)
        self.assertNotIn("m4 physically verified", text)
        self.assertNotIn("cuda physically verified", text)


class EndpointInventoryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.store = SQLiteContextStore()
        manager = ContextManager(ContextConfig(), store=self.store)
        self.app = create_app(
            manager,
            OfflineModel(),
            runtime_coordinator=RuntimeCoordinator(state_path=None),
        )
        self.client = AsyncClient(
            transport=ASGITransport(app=self.app, raise_app_exceptions=False),
            base_url="http://127.0.0.1",
        )
        self.fixture = json.loads(API_FIXTURE.read_text(encoding="utf-8"))

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        self.store.close()

    def test_fixture_is_the_exact_local_endpoint_set_and_openapi_is_versioned(
        self,
    ) -> None:
        expected = {
            (item["method"], item["path"])
            for item in self.fixture["implemented_routes"]
        }
        actual = {
            (method, route.path)
            for route in self.app.routes
            for method in getattr(route, "methods", set())
            if route.path in {"/health", "/ready"} or route.path.startswith("/api/")
        }
        self.assertEqual(actual, expected)

        openapi = self.app.openapi()
        for method, path in expected:
            operation = openapi["paths"][path][method.casefold()]
            self.assertTrue(operation["responses"], (method, path))
        self.assertEqual(self.fixture["contract_version"], "2026-09-18")

    async def test_every_private_endpoint_rejects_missing_auth_with_correlated_error(
        self,
    ) -> None:
        request_ids: set[str] = set()
        for item in self.fixture["implemented_routes"]:
            if item["auth"] != "bearer":
                continue
            path = (
                item["path"]
                .replace("{operation_id}", "not-owned")
                .replace("{job_id}", "not-owned")
                .replace("{attempt_id}", "not-owned")
            )
            response = await self.client.request(item["method"], path, json={})
            self.assertEqual(response.status_code, 401, (item, response.text))
            payload = response.json()["error"]
            self.assertEqual(payload["code"], "unauthorized", item)
            self.assertEqual(payload["request_id"], response.headers["x-request-id"])
            self.assertEqual(
                response.headers["x-alim-contract-version"],
                self.fixture["contract_version"],
            )
            self.assertEqual(response.headers["cache-control"], "no-store")
            request_ids.add(payload["request_id"])
        private_count = sum(
            item["auth"] == "bearer" for item in self.fixture["implemented_routes"]
        )
        self.assertEqual(len(request_ids), private_count)

    async def test_public_probes_are_correlated_and_caller_request_id_is_not_trusted(
        self,
    ) -> None:
        health = await self.client.get(
            "/health", headers={"X-Request-Id": "attacker-value"}
        )
        ready = await self.client.get("/ready")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(ready.status_code, 503)
        for response in (health, ready):
            self.assertRegex(response.headers["x-request-id"], r"^req_[0-9a-f]{32}$")
            self.assertEqual(
                response.headers["x-alim-contract-version"],
                self.fixture["contract_version"],
            )
        self.assertNotEqual(health.headers["x-request-id"], "attacker-value")


if __name__ == "__main__":
    unittest.main()
