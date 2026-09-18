"""Safe, registry-owned acquisition of local model artifacts.

Request data never selects a URL, filename, checksum, or destination.  The
reviewed model registry owns those values; callers only select an allowlisted
model ID and explicitly authorize acquisition.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import time
import urllib.parse
import urllib.request
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol, Self

from .model_registry import ModelRegistryEntry, artifact_path


class ArtifactError(RuntimeError):
    """A stable artifact failure safe to translate into an API message code."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class HttpResponse(Protocol):
    """Small response seam used by deterministic tests."""

    status: int
    headers: object

    def read(self, size: int = -1) -> bytes: ...

    def __enter__(self) -> Self: ...

    def __exit__(self, *args: object) -> None: ...


OpenUrl = Callable[[urllib.request.Request, float], HttpResponse]
Progress = Callable[[int, int], None]
Cancelled = Callable[[], bool]
DiskUsage = Callable[[Path], tuple[int, int, int]]


def _open(request: urllib.request.Request, timeout: float) -> HttpResponse:
    return urllib.request.urlopen(request, timeout=timeout)  # type: ignore[return-value]


@contextmanager
def artifact_lock(path: Path, *, stale_seconds: float = 86_400) -> Iterator[None]:
    """Acquire a portable cross-process lock, recovering only stale locks."""

    lock = path.with_suffix(path.suffix + ".lock")
    deadline = time.monotonic() + 30
    while True:
        try:
            lock.mkdir()
            break
        except FileExistsError as error:
            try:
                if time.time() - lock.stat().st_mtime > stale_seconds:
                    lock.rmdir()
                    continue
            except (FileNotFoundError, OSError):
                continue
            if time.monotonic() >= deadline:
                raise ArtifactError("artifact_lock_timeout") from error
            time.sleep(0.1)
    try:
        yield
    finally:
        try:
            lock.rmdir()
        except FileNotFoundError:
            pass


class ArtifactStore:
    """Import or download one exact reviewed artifact into an external cache."""

    def __init__(
        self,
        root: Path,
        *,
        opener: OpenUrl = _open,
        disk_usage: DiskUsage = shutil.disk_usage,
    ) -> None:
        self.root = root.expanduser().resolve()
        self.opener = opener
        self.disk_usage = disk_usage

    @staticmethod
    def source_url(entry: ModelRegistryEntry) -> str:
        """Build the only permitted URL from immutable reviewed metadata."""

        if not entry.artifact_repository or not entry.artifact_revision or not entry.filename:
            raise ArtifactError("artifact_mapping_unresolved")
        repository = "/".join(
            urllib.parse.quote(segment, safe="")
            for segment in entry.artifact_repository.split("/")
        )
        filename = urllib.parse.quote(entry.filename, safe="")
        revision = urllib.parse.quote(entry.artifact_revision, safe="")
        return f"https://huggingface.co/{repository}/resolve/{revision}/{filename}"

    def _paths(self, entry: ModelRegistryEntry) -> tuple[Path, Path, Path]:
        target = artifact_path(entry, self.root)
        if target is None:
            raise ArtifactError("artifact_mapping_unresolved")
        parent = target.parent
        parent.mkdir(parents=True, exist_ok=True)
        if parent.is_symlink() or target.is_symlink():
            raise ArtifactError("artifact_path_unsafe")
        return target, target.with_suffix(target.suffix + ".partial"), parent / ".alim-model.json"

    def _preflight(self, entry: ModelRegistryEntry, parent: Path, existing: int = 0) -> None:
        if entry.expected_bytes is None:
            raise ArtifactError("artifact_mapping_unresolved")
        required = max(0, entry.expected_bytes - existing) + 64 * 1024**2
        try:
            free = self.disk_usage(parent).free
        except OSError as error:
            raise ArtifactError("storage_measurement_failed") from error
        if free < required:
            raise ArtifactError("insufficient_storage")

    @staticmethod
    def _verify(entry: ModelRegistryEntry, path: Path) -> None:
        if path.is_symlink() or not path.is_file():
            raise ArtifactError("artifact_path_unsafe")
        size = path.stat().st_size
        if size != entry.expected_bytes:
            raise ArtifactError("artifact_size_mismatch")
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            if handle.read(4) != b"GGUF":
                raise ArtifactError("artifact_format_invalid")
            handle.seek(0)
            for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
                digest.update(block)
        if digest.hexdigest() != entry.sha256:
            raise ArtifactError("artifact_checksum_mismatch")

    @staticmethod
    def _write_marker(entry: ModelRegistryEntry, marker: Path, acquisition: str) -> None:
        payload = {
            "model_id": entry.model_id,
            "publisher_repository": entry.publisher_repository,
            "artifact_repository": entry.artifact_repository,
            "artifact_revision": entry.artifact_revision,
            "filename": entry.filename,
            "sha256": entry.sha256,
            "expected_bytes": entry.expected_bytes,
            "license_id": entry.license_id,
            "acquisition": acquisition,
            "verified_at": datetime.now(UTC).isoformat(),
        }
        temporary = marker.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        os.chmod(temporary, 0o600)
        os.replace(temporary, marker)

    def import_local(self, entry: ModelRegistryEntry, source: Path) -> Path:
        """Copy, fully verify, and atomically publish an operator-selected file."""

        source = source.expanduser()
        if source.is_symlink():
            raise ArtifactError("artifact_source_unsafe")
        source = source.resolve(strict=True)
        if not source.is_file():
            raise ArtifactError("artifact_source_unsafe")
        target, staging, marker = self._paths(entry)
        self._preflight(entry, target.parent)
        with artifact_lock(target):
            try:
                with source.open("rb") as incoming, staging.open("wb") as outgoing:
                    shutil.copyfileobj(incoming, outgoing, 8 * 1024 * 1024)
                    outgoing.flush()
                    os.fsync(outgoing.fileno())
                self._verify(entry, staging)
                os.replace(staging, target)
                self._write_marker(entry, marker, "local-import")
            except Exception:
                staging.unlink(missing_ok=True)
                raise
        return target

    def download(
        self,
        entry: ModelRegistryEntry,
        *,
        authorized: bool,
        progress: Progress | None = None,
        cancelled: Cancelled | None = None,
    ) -> Path:
        """Resume, verify and atomically publish an explicitly authorized download."""

        if not authorized:
            raise ArtifactError("download_not_authorized")
        target, staging, marker = self._paths(entry)
        with artifact_lock(target):
            if target.is_file():
                self._verify(entry, target)
                return target
            offset = staging.stat().st_size if staging.is_file() and not staging.is_symlink() else 0
            if entry.expected_bytes is None or offset > entry.expected_bytes:
                staging.unlink(missing_ok=True)
                offset = 0
            self._preflight(entry, target.parent, offset)
            headers = {"Accept-Encoding": "identity", "User-Agent": "Alim-local-runtime/1"}
            if offset:
                headers["Range"] = f"bytes={offset}-"
            request = urllib.request.Request(self.source_url(entry), headers=headers)
            try:
                with self.opener(request, 60.0) as response:
                    status = getattr(response, "status", 200)
                    content_range = getattr(response, "headers", {}).get("Content-Range", "")
                    resumed = bool(offset and status == 206 and content_range.startswith(f"bytes {offset}-"))
                    if offset and not resumed:
                        offset = 0
                    mode = "ab" if resumed else "wb"
                    written = offset
                    with staging.open(mode) as handle:
                        while True:
                            if cancelled and cancelled():
                                raise ArtifactError("download_cancelled")
                            block = response.read(8 * 1024 * 1024)
                            if not block:
                                break
                            handle.write(block)
                            written += len(block)
                            if progress and entry.expected_bytes:
                                progress(written, entry.expected_bytes)
                        handle.flush()
                        os.fsync(handle.fileno())
                self._verify(entry, staging)
                os.replace(staging, target)
                self._write_marker(entry, marker, "hugging-face-pinned")
            except ArtifactError as error:
                if error.code in {
                    "artifact_size_mismatch",
                    "artifact_format_invalid",
                    "artifact_checksum_mismatch",
                }:
                    staging.unlink(missing_ok=True)
                raise
            except (OSError, TimeoutError) as error:
                raise ArtifactError("download_failed") from error
        return target
