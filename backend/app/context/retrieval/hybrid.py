"""Fuse sparse and dense rankings, then remove duplicate evidence."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from ..models import ContextItem
from ..text import lexical_overlap, normalize_text
from .base import Retriever


def reciprocal_rank_fusion(
    rankings: list[list[ContextItem]],
    *,
    weights: list[float] | None = None,
    k: int = 60,
    limit: int = 10,
) -> list[ContextItem]:
    """Merge ranked lists without requiring comparable underlying scores."""

    if weights is None:
        weights = [1.0] * len(rankings)
    if len(weights) != len(rankings):
        raise ValueError("Each ranking needs one weight")
    scores: dict[str, float] = defaultdict(float)
    by_id: dict[str, ContextItem] = {}
    for ranking, weight in zip(rankings, weights, strict=True):
        for rank, item in enumerate(ranking, start=1):
            scores[item.id] += weight / (k + rank)
            current = by_id.get(item.id)
            if current is None or item.relevance_score > current.relevance_score:
                by_id[item.id] = item
    maximum = max(scores.values(), default=1.0)
    fused: list[ContextItem] = []
    for item_id, score in sorted(scores.items(), key=lambda pair: (-pair[1], pair[0])):
        item = by_id[item_id]
        item.relevance_score = score / maximum
        item.metadata["fusion_score"] = score
        fused.append(item)
    return fused[:limit]


def deduplicate_items(
    items: list[ContextItem], *, overlap_threshold: float = 0.86
) -> list[ContextItem]:
    """Remove repeated IDs and near-identical chunks from the same document."""

    kept: list[ContextItem] = []
    seen_ids: set[str] = set()
    seen_content: set[str] = set()
    for item in items:
        normalized = normalize_text(item.content)
        document_id = str(item.metadata.get("document_id", ""))
        duplicate = item.id in seen_ids or normalized in seen_content
        if not duplicate:
            duplicate = any(
                document_id
                and document_id == str(existing.metadata.get("document_id", ""))
                and lexical_overlap(item.content, existing.content) >= overlap_threshold
                for existing in kept
            )
        if duplicate:
            continue
        kept.append(item)
        seen_ids.add(item.id)
        seen_content.add(normalized)
    return kept


class HybridRetriever:
    """Run dense and sparse retrieval concurrently and fuse their rankings."""

    def __init__(
        self,
        dense: Retriever,
        sparse: Retriever,
        *,
        dense_weight: float = 1.0,
        sparse_weight: float = 1.0,
        rrf_k: int = 60,
        dense_limit: int = 15,
        sparse_limit: int = 15,
    ) -> None:
        """Configure component retrievers and reciprocal-rank fusion weights."""

        self.dense = dense
        self.sparse = sparse
        self.weights = [dense_weight, sparse_weight]
        self.rrf_k = rrf_k
        self.dense_limit = dense_limit
        self.sparse_limit = sparse_limit
        self.last_debug: dict[str, int] = {}

    async def retrieve(
        self,
        query: str,
        *,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 10,
    ) -> list[ContextItem]:
        """Retrieve, fuse, deduplicate, and retain debug candidate counts."""

        common = {
            "subject": subject,
            "document_types": document_types,
            "document_ids": document_ids,
        }
        dense, sparse = await asyncio.gather(
            self.dense.retrieve(query, limit=self.dense_limit, **common),
            self.sparse.retrieve(query, limit=self.sparse_limit, **common),
        )
        fused = reciprocal_rank_fusion(
            [dense, sparse], weights=self.weights, k=self.rrf_k, limit=max(limit * 2, limit)
        )
        result = deduplicate_items(fused)[:limit]
        self.last_debug = {
            "dense_chunks": len(dense),
            "sparse_chunks": len(sparse),
            "fused_candidates": len(fused),
            "deduplicated_candidates": len(result),
        }
        return result
