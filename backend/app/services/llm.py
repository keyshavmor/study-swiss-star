"""Minimal OpenAI-compatible client for the repository-local Qwen server."""

from __future__ import annotations

import os
from dataclasses import dataclass
from time import monotonic
from typing import Any

import httpx

from ..context.models import CompiledContext
from ..model_spec import MODEL_NAME, RESERVED_OUTPUT_TOKENS
from ..platform import local_model_base_url


class ModelUnavailableError(RuntimeError):
    """Raised when the local model endpoint cannot provide a valid completion."""


@dataclass(slots=True)
class LLMResponse:
    """Normalized model answer returned to the FastAPI layer."""

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
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        """Configure the loopback OpenAI-compatible endpoint and timeout."""

        self.base_url = (base_url or local_model_base_url()).rstrip("/")
        self.model = model or os.getenv("ALIM_LLM_MODEL", MODEL_NAME)
        self.api_key = api_key or os.getenv("ALIM_LLM_API_KEY", "local")
        self.timeout_seconds = timeout_seconds or float(os.getenv("ALIM_LLM_TIMEOUT_SECONDS", "90"))
        self.transport = transport

    async def complete(self, context: CompiledContext) -> LLMResponse:
        """Generate an answer through cancellable async loopback HTTP."""

        self.last_context = context
        started = monotonic()
        payload = {
            "model": self.model,
            "messages": context.prompt_messages,
            "stream": False,
            "max_tokens": int(
                context.retrieval_debug.get("token_budget", {}).get(
                    "reserved_output", RESERVED_OUTPUT_TOKENS
                )
            ),
            "temperature": 1.0,
            "top_p": 0.95,
            "top_k": 20,
        }
        response = await self._request("/chat/completions", payload)
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
        """Probe model reachability for health and diagnostics endpoints."""

        started = monotonic()
        try:
            await self._request("/models", None, "GET", 3.0)
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

    async def _request(
        self,
        path: str,
        payload: dict[str, Any] | None,
        method: str = "POST",
        timeout_seconds: float | None = None,
    ) -> dict[str, Any]:
        """Perform cancellable authenticated JSON I/O against the local model API."""

        try:
            async with httpx.AsyncClient(
                base_url=self.base_url,
                timeout=timeout_seconds or self.timeout_seconds,
                headers={"Authorization": f"Bearer {self.api_key}"},
                transport=self.transport,
            ) as client:
                response = await client.request(method, path, json=payload)
                response.raise_for_status()
                value = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ModelUnavailableError("The local model endpoint is unavailable") from error
        if not isinstance(value, dict):
            raise ModelUnavailableError("Local model returned a non-object response")
        return value
