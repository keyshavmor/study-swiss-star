from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from time import monotonic
from typing import Any

from ..context.models import CompiledContext


class ModelUnavailableError(RuntimeError):
    pass


@dataclass(slots=True)
class LLMResponse:
    content: str
    model: str
    latency_ms: int


class LocalOpenAICompatibleClient:
    """Small local-model client; no request is sent anywhere except the configured endpoint."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self.base_url = (
            base_url or os.getenv("ALIM_LLM_BASE_URL", "http://127.0.0.1:11434/v1")
        ).rstrip("/")
        self.model = model or os.getenv("ALIM_LLM_MODEL", "llama3.1:8b-instruct")
        self.api_key = api_key or os.getenv("ALIM_LLM_API_KEY", "local")
        self.timeout_seconds = timeout_seconds or float(os.getenv("ALIM_LLM_TIMEOUT_SECONDS", "90"))

    async def complete(self, context: CompiledContext) -> LLMResponse:
        return await asyncio.to_thread(self._complete_sync, context)

    def _complete_sync(self, context: CompiledContext) -> LLMResponse:
        started = monotonic()
        payload = {
            "model": self.model,
            "messages": context.prompt_messages,
            "stream": False,
            "temperature": 0.2,
        }
        response = self._request("/chat/completions", payload)
        try:
            content = response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as error:
            raise ModelUnavailableError("Local model returned an invalid response") from error
        if not isinstance(content, str) or not content.strip():
            raise ModelUnavailableError("Local model returned an empty answer")
        return LLMResponse(
            content=content.strip(),
            model=str(response.get("model") or self.model),
            latency_ms=round((monotonic() - started) * 1000),
        )

    async def status(self) -> dict[str, Any]:
        started = monotonic()
        try:
            await asyncio.to_thread(self._request, "/models", None, "GET", 3.0)
        except ModelUnavailableError:
            return {
                "provider": "openai-compatible",
                "model": self.model,
                "endpoint": self.base_url,
                "mode": "local",
                "reachable": False,
                "latency_ms": round((monotonic() - started) * 1000),
            }
        return {
            "provider": "openai-compatible",
            "model": self.model,
            "endpoint": self.base_url,
            "mode": "local",
            "reachable": True,
            "latency_ms": round((monotonic() - started) * 1000),
        }

    def _request(
        self,
        path: str,
        payload: dict[str, Any] | None,
        method: str = "POST",
        timeout_seconds: float | None = None,
    ) -> dict[str, Any]:
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        try:
            with urllib.request.urlopen(
                request, timeout=timeout_seconds or self.timeout_seconds
            ) as response:
                value = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            raise ModelUnavailableError(f"Local model is unavailable at {self.base_url}") from error
        if not isinstance(value, dict):
            raise ModelUnavailableError("Local model returned a non-object response")
        return value
