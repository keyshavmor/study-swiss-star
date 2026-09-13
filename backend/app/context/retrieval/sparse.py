"""Local BM25-style lexical retrieval over persisted learning-material chunks."""

from __future__ import annotations

import math
from collections import Counter

from ..models import ContextItem
from ..store import SQLiteContextStore
from ..text import terms
from .common import chunk_to_item


class SparseRetriever:
    """Rank filtered chunks with deterministic lexical relevance."""

    def __init__(
        self,
        store: SQLiteContextStore,
        *,
        k1: float = 1.5,
        b: float = 0.75,
        max_chunks: int = 500,
    ) -> None:
        """Configure BM25 constants and the maximum local corpus scan."""

        self.store = store
        self.k1 = k1
        self.b = b
        self.max_chunks = max_chunks

    async def retrieve(
        self,
        query: str,
        *,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 10,
    ) -> list[ContextItem]:
        """Return the highest-scoring lexical matches."""

        chunks = self.store.list_chunks(
            subject=subject,
            document_types=document_types,
            document_ids=document_ids,
            limit=self.max_chunks,
        )
        query_terms = terms(query)
        if not chunks or not query_terms:
            return []
        documents = [terms(chunk.content) for chunk in chunks]
        average_length = sum(map(len, documents)) / max(1, len(documents))
        document_frequency = Counter(
            token for document in documents for token in set(document) if token in query_terms
        )
        raw_scores: list[float] = []
        for document in documents:
            frequencies = Counter(document)
            score = 0.0
            for token in query_terms:
                frequency = frequencies[token]
                if not frequency:
                    continue
                frequency_docs = document_frequency[token]
                inverse_frequency = math.log(
                    1 + (len(documents) - frequency_docs + 0.5) / (frequency_docs + 0.5)
                )
                denominator = frequency + self.k1 * (
                    1 - self.b + self.b * len(document) / max(1.0, average_length)
                )
                score += inverse_frequency * frequency * (self.k1 + 1) / denominator
            raw_scores.append(score)
        maximum = max(raw_scores) or 1.0
        ranked = sorted(
            (
                (score, chunk_to_item(chunk, score / maximum))
                for score, chunk in zip(raw_scores, chunks, strict=True)
                if score > 0
            ),
            key=lambda pair: (-pair[0], pair[1].id),
        )
        return [item for _, item in ranked[:limit]]
