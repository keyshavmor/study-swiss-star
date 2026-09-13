"""Fast deterministic token estimation used before local model submission."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Protocol


class TokenCounter(Protocol):
    """Count model-like tokens in a string."""

    def count(self, text: str) -> int:
        """Estimate the number of model tokens in ``text``."""

        ...


_pieces = re.compile(r"\w+|[^\w\s]", re.UNICODE)


@lru_cache(maxsize=16_384)
def _approximate_count(text: str) -> int:
    """Estimate subword tokens from cached Unicode word/punctuation pieces."""

    if not text:
        return 0
    pieces = _pieces.findall(text)
    # Long identifiers/words often split into several model tokens.
    return sum(max(1, (len(piece) + 7) // 8) for piece in pieces)


class ApproximateTokenCounter:
    """Fast local fallback; replace with the serving model's tokenizer when available."""

    def count(self, text: str) -> int:
        """Return a cached conservative estimate suitable for hard prompt trimming."""

        return _approximate_count(text)
