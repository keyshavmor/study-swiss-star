"""Ingest text, Markdown, PDF, and DOCX learning material into local retrieval."""

from __future__ import annotations

import hashlib
import uuid
import zipfile
from pathlib import Path
from typing import Any

from ..context.models import DocumentChunk
from ..context.retrieval.dense import Embedder
from ..context.store_base import ContextStore
from ..context.tokenization import TokenCounter


class UnsupportedDocumentError(ValueError):
    """Raised when a document type or optional parser is unavailable."""


MAX_MATERIAL_BYTES = 50 * 1024 * 1024
MAX_EXTRACTED_CHARACTERS = 5_000_000
MAX_PDF_PAGES = 2_000
MAX_DOCX_ENTRIES = 10_000
MAX_DOCX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
SUPPORTED_SUFFIXES = frozenset({".txt", ".md", ".markdown", ".pdf", ".docx"})


class DocumentIngestor:
    """Extract, overlap-chunk, embed, and persist source material."""

    def __init__(
        self,
        store: ContextStore,
        counter: TokenCounter,
        embedder: Embedder,
        *,
        chunk_tokens: int = 500,
        overlap_tokens: int = 60,
    ) -> None:
        """Configure persistence, token counting, embedding, and chunk overlap."""

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
        """Chunk and index plain text with supplied provenance metadata."""

        if len(content) > MAX_EXTRACTED_CHARACTERS:
            raise UnsupportedDocumentError("Document text exceeds the extraction limit")
        if not content.strip():
            raise ValueError("Document contains no extractable text")
        document_id = document_id or str(uuid.uuid4())
        texts = self._split(content)
        chunks: list[DocumentChunk] = []
        for index, text in enumerate(texts):
            chunks.append(
                DocumentChunk(
                    id=str(
                        uuid.uuid5(
                            uuid.NAMESPACE_URL,
                            f"alim-document-chunk|{document_id}|{page or 0}|{index}",
                        )
                    ),
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
        """Extract a supported local file before delegating to text ingestion."""

        file_path = Path(path)
        if file_path.is_symlink() or not file_path.is_file():
            raise UnsupportedDocumentError("Document path is not a regular file")
        size = file_path.stat().st_size
        if size <= 0:
            raise ValueError("Document contains no extractable text")
        if size > MAX_MATERIAL_BYTES:
            raise UnsupportedDocumentError("Document exceeds the 50 MiB material limit")
        suffix = file_path.suffix.casefold()
        if suffix not in SUPPORTED_SUFFIXES:
            raise UnsupportedDocumentError(f"Unsupported document type: {suffix or '(none)'}")
        self._validate_signature(file_path, suffix)
        source = metadata.pop("source", str(file_path))
        if suffix in {".txt", ".md", ".markdown"}:
            return await self.ingest_text(
                file_path.read_text(encoding="utf-8"), source=source, **metadata
            )
        if suffix == ".pdf":
            try:
                from pypdf import PdfReader
            except ImportError as error:
                raise UnsupportedDocumentError(
                    "Install the 'documents' extra to parse PDF files"
                ) from error
            chunks: list[DocumentChunk] = []
            document_id = metadata.pop("document_id", str(uuid.uuid4()))
            pages = PdfReader(str(file_path)).pages
            if len(pages) > MAX_PDF_PAGES:
                raise UnsupportedDocumentError("PDF exceeds the page limit")
            extracted_characters = 0
            for page_number, page in enumerate(pages, start=1):
                text = page.extract_text() or ""
                extracted_characters += len(text)
                if extracted_characters > MAX_EXTRACTED_CHARACTERS:
                    raise UnsupportedDocumentError("PDF text exceeds the extraction limit")
                if text.strip():
                    chunks.extend(
                        await self.ingest_text(
                            text,
                            document_id=document_id,
                            source=source,
                            page=page_number,
                            **metadata,
                        )
                    )
            if not chunks:
                raise ValueError("PDF contains no extractable text")
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
            return await self.ingest_text(text, source=source, **metadata)
        raise UnsupportedDocumentError(f"Unsupported document type: {suffix or '(none)'}")

    @staticmethod
    def _validate_signature(file_path: Path, suffix: str) -> None:
        """Reject extension/content mismatches and bounded DOCX archive bombs."""

        with file_path.open("rb") as stream:
            header = stream.read(8)
        if suffix == ".pdf":
            if not header.startswith(b"%PDF-"):
                raise UnsupportedDocumentError("File content does not match its PDF extension")
            return
        if suffix == ".docx":
            if not header.startswith(b"PK"):
                raise UnsupportedDocumentError("File content does not match its DOCX extension")
            try:
                with zipfile.ZipFile(file_path) as archive:
                    entries = archive.infolist()
                    total = sum(entry.file_size for entry in entries)
                    if len(entries) > MAX_DOCX_ENTRIES or total > MAX_DOCX_UNCOMPRESSED_BYTES:
                        raise UnsupportedDocumentError("DOCX archive exceeds extraction limits")
                    names = {entry.filename for entry in entries}
                    if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                        raise UnsupportedDocumentError("DOCX archive is missing required content")
            except zipfile.BadZipFile as error:
                raise UnsupportedDocumentError("DOCX archive is invalid") from error
            return
        raw = file_path.read_bytes()
        if b"\x00" in raw:
            raise UnsupportedDocumentError("Text document contains binary data")
        try:
            raw.decode("utf-8")
        except UnicodeDecodeError as error:
            raise UnsupportedDocumentError("Text document must be valid UTF-8") from error

    def _split(self, content: str) -> list[str]:
        """Split text on word boundaries while retaining bounded overlap."""

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


def stable_text_document_id(student_id: str, title: str, subject: str, content: str) -> str:
    """Deduplicate exact repeated text ingestion within one verified user scope."""

    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    return str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"alim-text-document|{student_id}|{title.strip()}|{subject.strip()}|{digest}",
        )
    )
