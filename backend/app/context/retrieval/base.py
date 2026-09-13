"""Protocol shared by sparse, dense, and hybrid retrievers."""

from __future__ import annotations

from typing import Protocol

from ..models import ContextItem


class Retriever(Protocol):
    """Return ranked context items for a query and optional filters."""

    async def retrieve(
        self,
        query: str,
        *,
        subject: str | None = None,
        document_types: set[str] | None = None,
        document_ids: set[str] | None = None,
        limit: int = 10,
    ) -> list[ContextItem]:
        """Return ranked evidence after applying optional metadata filters."""

        ...
