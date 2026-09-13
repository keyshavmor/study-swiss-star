from __future__ import annotations

import re
from functools import lru_cache
from typing import Protocol


class TokenCounter(Protocol):
    def count(self, text: str) -> int: ...


_pieces = re.compile(r"\w+|[^\w\s]", re.UNICODE)


@lru_cache(maxsize=16_384)
def _approximate_count(text: str) -> int:
    if not text:
        return 0
    pieces = _pieces.findall(text)
    # Long identifiers/words often split into several model tokens.
    return sum(max(1, (len(piece) + 7) // 8) for piece in pieces)


class ApproximateTokenCounter:
    """Fast local fallback; replace with the serving model's tokenizer when available."""

    def count(self, text: str) -> int:
        return _approximate_count(text)
