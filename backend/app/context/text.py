from __future__ import annotations

import re
from collections.abc import Iterable

_words = re.compile(r"[\wÀ-ÿ]+", re.UNICODE)


def terms(text: str) -> list[str]:
    return [word.casefold() for word in _words.findall(text) if len(word) > 1]


def term_set(text: str) -> set[str]:
    return set(terms(text))


def lexical_overlap(left: str, right: str) -> float:
    a, b = term_set(left), term_set(right)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def normalize_text(text: str) -> str:
    return " ".join(terms(text))


def unique_preserving_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result
