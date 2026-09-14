"""Deterministic and OpenAI-compatible embedding adapters plus dense retrieval."""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import urllib.error
import urllib.request
from itertools import pairwise
from typing import Protocol

from ..models import ContextItem
from ..store_base import ContextStore
from ..text import terms
from .common import chunk_to_item


class Embedder(Protocol):
    """Produce one numeric embedding for input text."""

    model_name: str

    async def embed(self, text: str) -> list[float]:
        """Return one vector for the supplied text."""

        ...


class HashingEmbedder:
    """No-network fallback for development; inject a local model embedder in production."""

    def __init__(self, dimensions: int = 384) -> None:
        """Set the stable fallback vector width."""

        self.dimensions = dimensions
        self.model_name = f"hashing-fallback-{dimensions}d"

    async def embed(self, text: str) -> list[float]:
        """Create a repeatable normalized bag-of-hashes vector without network access."""

        vector = [0.0] * self.dimensions
        tokens = terms(text)
        features = tokens + [f"{a}_{b}" for a, b in pairwise(tokens)]
        for feature in features:
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            value = int.from_bytes(digest, "big")
            index = value % self.dimensions
            vector[index] += -1.0 if value & 1 else 1.0
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]


class EmbeddingUnavailableError(RuntimeError):
    """Raised when an explicitly configured local embedding service fails."""


class OpenAICompatibleEmbedder:
    """Adapter for a local server exposing the OpenAI-compatible embeddings endpoint."""

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        api_key: str = "local",
        timeout_seconds: float = 30.0,
    ) -> None:
        """Configure a loopback embeddings endpoint."""

        self.base_url = base_url.rstrip("/")
        self.model_name = model
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    async def embed(self, text: str) -> list[float]:
        """Request an embedding without blocking the event loop."""

        return await asyncio.to_thread(self._embed_sync, text)

    def _embed_sync(self, text: str) -> list[float]:
        """Perform and validate one synchronous embeddings request."""

        payload = json.dumps({"model": self.model_name, "input": text}).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}/embeddings",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                value = json.loads(response.read().decode("utf-8"))
            embedding = value["data"][0]["embedding"]
            if not isinstance(embedding, list) or not embedding:
                raise TypeError
            return [float(component) for component in embedding]
        except (
            urllib.error.URLError,
            TimeoutError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            TypeError,
            ValueError,
        ) as error:
            raise EmbeddingUnavailableError(
                f"Local embedding model is unavailable at {self.base_url}"
            ) from error


def cosine(left: list[float], right: list[float]) -> float:
    """Compute cosine similarity, returning zero for missing or zero vectors."""

    if len(left) != len(right) or not left:
        return 0.0
    return sum(a * b for a, b in zip(left, right, strict=True))


class DenseRetriever:
    """Rank locally stored chunks by embedding similarity."""

    def __init__(self, store: ContextStore, embedder: Embedder, *, max_chunks: int = 500) -> None:
        """Configure the local corpus, embedder, and candidate ceiling."""

        self.store = store
        self.embedder = embedder
        self.max_chunks = max_chunks

    async def retrieve(
        self,
        query: str,
        *,
        student_id: str,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 10,
    ) -> list[ContextItem]:
        """Embed the query and return the best matching filtered chunks."""

        query_embedding = await self.embedder.embed(query)
        chunks = self.store.list_chunks(
            student_id=student_id,
            subject=subject,
            document_types=document_types,
            document_ids=document_ids,
            limit=self.max_chunks,
        )
        scored: list[tuple[float, ContextItem]] = []
        for chunk in chunks:
            embedding = chunk.embedding
            if embedding is None or len(embedding) != len(query_embedding):
                embedding = await self.embedder.embed(chunk.content)
                self.store.update_chunk_embedding(chunk.id, embedding)
            score = max(0.0, cosine(query_embedding, embedding))
            scored.append((score, chunk_to_item(chunk, score)))
        scored.sort(key=lambda pair: (-pair[0], pair[1].id))
        return [item for _, item in scored[:limit]]
