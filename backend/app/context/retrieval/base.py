from __future__ import annotations

from typing import Protocol

from ..models import ContextItem


class Retriever(Protocol):
    async def retrieve(
        self,
        query: str,
        *,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 10,
    ) -> list[ContextItem]: ...
