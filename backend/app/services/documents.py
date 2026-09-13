from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from ..context.models import DocumentChunk
from ..context.retrieval.dense import Embedder
from ..context.store import SQLiteContextStore
from ..context.tokenization import TokenCounter


class UnsupportedDocumentError(ValueError):
    pass


class DocumentIngestor:
    def __init__(
        self,
        store: SQLiteContextStore,
        counter: TokenCounter,
        embedder: Embedder,
        *,
        chunk_tokens: int = 500,
        overlap_tokens: int = 60,
    ) -> None:
        self.store = store
        self.counter = counter
        self.embedder = embedder
        self.chunk_tokens = chunk_tokens
        self.overlap_tokens = overlap_tokens

    async def ingest_text(
        self,
        content: str,
        *,
        title: str,
        subject: str,
        document_type: str,
        student_id: str | None = None,
        document_id: str | None = None,
        source: str | None = None,
        topic: str | None = None,
        subtopic: str | None = None,
        section: str | None = None,
        chapter: str | None = None,
        language: str | None = None,
        page: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> list[DocumentChunk]:
        if not content.strip():
            raise ValueError("Document contains no extractable text")
        document_id = document_id or f"doc_{uuid.uuid4().hex}"
        texts = self._split(content)
        chunks: list[DocumentChunk] = []
        for index, text in enumerate(texts):
            chunks.append(
                DocumentChunk(
                    id=f"{document_id}_p{page or 0:04d}_chunk_{index:05d}",
                    document_id=document_id,
                    content=text,
                    title=title,
                    subject=subject,
                    topic=topic,
                    subtopic=subtopic,
                    document_type=document_type,
                    source=source,
                    page=page,
                    section=section,
                    chapter=chapter,
                    language=language,
                    token_count=self.counter.count(text),
                    embedding=await self.embedder.embed(text),
                    metadata=(metadata or {}) | {"chunk_index": index},
                )
            )
        self.store.add_chunks(chunks, student_id=student_id)
        return chunks

    async def ingest_file(self, path: str | Path, **metadata: Any) -> list[DocumentChunk]:
        file_path = Path(path)
        suffix = file_path.suffix.casefold()
        if suffix in {".txt", ".md", ".markdown"}:
            return await self.ingest_text(
                file_path.read_text(encoding="utf-8"), source=str(file_path), **metadata
            )
        if suffix == ".pdf":
            try:
                from pypdf import PdfReader
            except ImportError as error:
                raise UnsupportedDocumentError(
                    "Install the 'documents' extra to parse PDF files"
                ) from error
            chunks: list[DocumentChunk] = []
            document_id = metadata.pop("document_id", f"doc_{uuid.uuid4().hex}")
            for page_number, page in enumerate(PdfReader(str(file_path)).pages, start=1):
                text = page.extract_text() or ""
                if text.strip():
                    chunks.extend(
                        await self.ingest_text(
                            text,
                            document_id=document_id,
                            source=str(file_path),
                            page=page_number,
                            **metadata,
                        )
                    )
            return chunks
        if suffix == ".docx":
            try:
                from docx import Document
            except ImportError as error:
                raise UnsupportedDocumentError(
                    "Install the 'documents' extra to parse DOCX files"
                ) from error
            document = Document(str(file_path))
            text = "\n\n".join(
                paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()
            )
            return await self.ingest_text(text, source=str(file_path), **metadata)
        raise UnsupportedDocumentError(f"Unsupported document type: {suffix or '(none)'}")

    def _split(self, content: str) -> list[str]:
        words = content.split()
        if not words:
            return []
        chunks: list[str] = []
        current: list[str] = []
        for word in words:
            candidate = " ".join(current + [word])
            if current and self.counter.count(candidate) > self.chunk_tokens:
                chunks.append(" ".join(current))
                overlap: list[str] = []
                for previous in reversed(current):
                    if self.counter.count(" ".join([previous] + overlap)) > self.overlap_tokens:
                        break
                    overlap.insert(0, previous)
                current = overlap
            current.append(word)
        if current:
            chunks.append(" ".join(current))
        return chunks
