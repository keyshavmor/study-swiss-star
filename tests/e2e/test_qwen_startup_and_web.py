"""Process-level test from startup preload through web-aware bounded chat."""

from __future__ import annotations

import json
import socket
import sys
import tempfile
import unittest
from pathlib import Path

from app.context.config import ContextBudgetConfig, ContextConfig, WebConfig
from app.context.manager import ContextManager
from app.context.store import SQLiteContextStore
from app.context.tokenization import ApproximateTokenCounter
from app.context.web import CachedWebRetriever, WebResult
from app.main import create_app
from app.model_spec import MODEL_FILENAME, MODEL_NAME
from app.services.llm import LocalOpenAICompatibleClient
from app.services.model_runtime import ModelRuntimeConfig, ModelRuntimeManager
from httpx import ASGITransport, AsyncClient

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def free_port() -> int:
    """Reserve an ephemeral loopback port for the fake model server."""

    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def make_checkpoint(path: Path) -> None:
    """Create a tiny GGUF-shaped checkpoint fixture; no real model is loaded here."""

    path.mkdir(parents=True, exist_ok=True)
    (path / MODEL_FILENAME).write_bytes(b"GGUF-test-weight-placeholder")
    (path / ".alim-model.json").write_text(
        json.dumps({"repository": MODEL_NAME, "revision": "test"}), encoding="utf-8"
    )


class FakeWebClient:
    """Return current-source evidence without external network access."""

    calls = 0

    async def search(self, query: str, *, limit: int) -> list[WebResult]:
        """Return an oversized deterministic page to exercise trimming."""

        self.calls += 1
        return [
            WebResult(
                title="Current ATP research",
                url="https://example.edu/current-atp",
                content=("Current research evidence about ATP production. " * 25),
                provider="E2E fixture",
                fetched_at="2026-09-13T00:00:00+00:00",
            )
        ][:limit]


class QwenStartupAndWebTests(unittest.IsolatedAsyncioTestCase):
    """Verify the full non-Supabase backend path across an actual child process."""

    async def test_preload_chat_web_context_and_budget_end_to_end(self) -> None:
        """Validate preload, web provenance, local chat, and strict budgeting."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            model_path = root / "models" / "Qwen3.8-27B"
            make_checkpoint(model_path)
            port = free_port()
            runtime = ModelRuntimeManager(
                ModelRuntimeConfig(
                    model_path=model_path,
                    base_url=f"http://127.0.0.1:{port}/v1",
                    host="127.0.0.1",
                    port=port,
                    max_model_len=2_000,
                    startup_timeout_seconds=10,
                    poll_seconds=0.05,
                    log_path=root / "model.log",
                    command=(
                        f"{sys.executable} {REPOSITORY_ROOT / 'tests/e2e/fake_openai_server.py'} "
                        f"--port {port}"
                    ),
                )
            )
            store = SQLiteContextStore()
            config = ContextConfig(
                budget=ContextBudgetConfig(
                    max_context_tokens=2_000,
                    reserve_output_tokens=500,
                    system_tokens=300,
                    web_tokens=300,
                ),
                web=WebConfig(max_results=1, max_chars_per_result=20_000),
            )
            web_client = FakeWebClient()
            web = CachedWebRetriever(
                store, ApproximateTokenCounter(), config.web, web_client
            )
            manager = ContextManager(config, store=store, web_retriever=web)
            llm = LocalOpenAICompatibleClient(
                base_url=f"http://127.0.0.1:{port}/v1",
                model=MODEL_NAME,
                timeout_seconds=5,
            )
            app = create_app(manager, llm, runtime)
            try:
                async with app.router.lifespan_context(app):
                    self.assertTrue(await runtime.is_ready())
                    client = AsyncClient(
                        transport=ASGITransport(app=app), base_url="http://test"
                    )
                    response = await client.post(
                        "/api/chat",
                        headers={"X-Student-Id": "student"},
                        json={
                            "thread_id": "thread",
                            "question": "Browse the latest current research about ATP production",
                            "subject_id": "biology",
                            "allow_web": True,
                        },
                    )
                    await client.aclose()
                    self.assertEqual(response.status_code, 200, response.text)
                    self.assertEqual(response.json()["used_model"], MODEL_NAME)
                    self.assertEqual(
                        response.json()["sources"][0]["url"],
                        "https://example.edu/current-atp",
                    )
                    self.assertLessEqual(llm.last_context.total_tokens, 1_500)
            finally:
                await runtime.stop()
                store.close()


if __name__ == "__main__":
    unittest.main()
