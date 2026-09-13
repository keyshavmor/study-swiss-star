from __future__ import annotations

import unittest

from httpx import ASGITransport, AsyncClient

from app.context.config import ContextConfig
from app.context.manager import ContextManager
from app.context.models import DocumentChunk
from app.context.store import SQLiteContextStore
from app.main import create_app
from app.services.llm import LLMResponse


class FakeLocalModel:
    model = "fake-local-model"

    async def status(self):
        return {
            "provider": "test",
            "model": self.model,
            "endpoint": "in-process",
            "mode": "local",
            "reachable": True,
            "latency_ms": 0,
        }

    async def complete(self, context):
        self.last_context = context
        return LLMResponse(
            content="Oxidative phosphorylation uses the proton gradient to make ATP.",
            model=self.model,
            latency_ms=1,
        )


class ApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.store = SQLiteContextStore()
        self.manager = ContextManager(ContextConfig(), store=self.store)
        self.model = FakeLocalModel()
        app = create_app(self.manager, self.model)
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        self.store.close()

    async def test_health_and_chat_use_compiled_context(self) -> None:
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

        response = await self.client.post(
            "/api/chat",
            headers={"X-Student-Id": "student-1"},
            json={
                "thread_id": "thread-1",
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
        self.assertIn("Biology Notes", self.model.last_context.prompt_messages[0]["content"])
        self.assertEqual(len(self.store.list_messages("student-1", "thread-1")), 2)

    async def test_streaming_request_returns_standard_error_envelope(self) -> None:
        response = await self.client.post(
            "/api/chat",
            json={"thread_id": "thread-1", "question": "Hello", "stream": True},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_request")
        self.assertIn("X-Request-Id", response.headers)


if __name__ == "__main__":
    unittest.main()
