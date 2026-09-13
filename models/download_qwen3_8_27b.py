#!/usr/bin/env python3
"""Idempotently download Alim's cross-platform Qwen3.8-27B Q4 checkpoint."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "backend"))

from app.model_spec import (
    MODEL_ARTIFACT_REPOSITORY,
    MODEL_FILENAME,
    MODEL_QUANTIZATION,
    MODEL_REPOSITORY,
    default_model_path,
    inspect_model,
)


def parser() -> argparse.ArgumentParser:
    """Build the command-line interface used by people, setup scripts, and tests."""

    value = argparse.ArgumentParser(
        description=(
            "Idempotently download and validate Qwen3.8-27B Q4_K_M weights for "
            "llama.cpp on Linux and Apple Silicon."
        )
    )
    action = value.add_mutually_exclusive_group()
    action.add_argument(
        "--check", action="store_true", help="Check local files without network"
    )
    action.add_argument(
        "--dry-run", action="store_true", help="Query the Hub without downloading"
    )
    value.add_argument("--destination", type=Path, default=default_model_path())
    value.add_argument("--revision", default="main")
    value.add_argument("--token", default=None, help="Optional Hugging Face token")
    value.add_argument(
        "--force", action="store_true", help="Refresh files even if complete"
    )
    value.add_argument(
        "--json", action="store_true", help="Emit machine-readable output"
    )
    return value


def emit(payload: dict[str, object], *, as_json: bool) -> None:
    """Print a stable human-readable or JSON status payload."""

    if as_json:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(f"status: {payload['status']}")
    print(f"repository: {MODEL_REPOSITORY}")
    print(f"artifact repository: {MODEL_ARTIFACT_REPOSITORY}")
    print(f"destination: {payload['path']}")
    if payload.get("message"):
        print(payload["message"])


def hub() -> object:
    """Import Hugging Face lazily so offline ``--check`` needs no extra package."""

    try:
        import huggingface_hub
    except ImportError as error:
        raise SystemExit(
            "huggingface-hub is required. Run `uv sync --project backend --extra model-download`."
        ) from error
    return huggingface_hub


def dry_run(args: argparse.Namespace) -> int:
    """Ask Hugging Face how much of the selected GGUF remains to download."""

    files = hub().snapshot_download(  # type: ignore[attr-defined]
        repo_id=MODEL_ARTIFACT_REPOSITORY,
        revision=args.revision,
        local_dir=args.destination,
        token=args.token,
        allow_patterns=[MODEL_FILENAME],
        dry_run=True,
    )
    required = [item for item in files if item.will_download]
    bytes_to_download = sum(item.file_size for item in required)
    emit(
        {
            "status": "present" if not required else "download_required",
            "path": str(args.destination.resolve()),
            "file_count": len(required),
            "bytes_to_download": bytes_to_download,
            "message": f"{len(required)} files / {bytes_to_download / 1024**3:.2f} GiB remaining",
        },
        as_json=args.json,
    )
    return 0


@contextmanager
def exclusive_download_lock(path: Path, timeout_seconds: float = 86_400.0):
    """Serialize downloads using an atomic directory lock on Linux and macOS.

    Directory creation is portable and atomic on both target systems, unlike
    Linux-specific locking helpers.  A stale lock older than the timeout is
    removed so an interrupted download does not block the user forever.
    """

    lock_directory = path.with_suffix(path.suffix + ".lock")
    while True:
        try:
            lock_directory.mkdir()
            break
        except FileExistsError:
            try:
                age = time.time() - lock_directory.stat().st_mtime
                if age > timeout_seconds:
                    lock_directory.rmdir()
                    continue
            except (FileNotFoundError, OSError):
                continue
            time.sleep(0.25)
    try:
        yield
    finally:
        try:
            lock_directory.rmdir()
        except FileNotFoundError:
            pass


def download(args: argparse.Namespace) -> int:
    """Resume the GGUF download, write provenance, and validate before success."""

    before = inspect_model(args.destination)
    if before.present and not args.force:
        emit(
            {
                "status": "present",
                "path": before.path,
                "message": f"Validated {before.shard_count} local weight shards; download skipped.",
            },
            as_json=args.json,
        )
        return 0

    args.destination.mkdir(parents=True, exist_ok=True)
    lock_path = args.destination.parent / ".qwen3.8-27b.download"
    with exclusive_download_lock(lock_path):
        after_lock = inspect_model(args.destination)
        if after_lock.present and not args.force:
            emit(
                {
                    "status": "present",
                    "path": after_lock.path,
                    "message": "Another process completed the download; local files validated.",
                },
                as_json=args.json,
            )
            return 0
        hub().snapshot_download(  # type: ignore[attr-defined]
            repo_id=MODEL_ARTIFACT_REPOSITORY,
            revision=args.revision,
            local_dir=args.destination,
            token=args.token,
            allow_patterns=[MODEL_FILENAME],
            force_download=args.force,
        )
        marker = {
            "repository": MODEL_REPOSITORY,
            "artifact_repository": MODEL_ARTIFACT_REPOSITORY,
            "filename": MODEL_FILENAME,
            "format": "GGUF",
            "quantization": MODEL_QUANTIZATION,
            "revision": args.revision,
            "downloaded_at": datetime.now(UTC).isoformat(),
            "platform": os.uname().sysname if hasattr(os, "uname") else sys.platform,
        }
        (args.destination / ".alim-model.json").write_text(
            json.dumps(marker, indent=2) + "\n", encoding="utf-8"
        )
        result = inspect_model(args.destination)
        if not result.present:
            raise SystemExit(
                f"Download is incomplete; missing: {', '.join(result.missing)}"
            )
        emit(
            {
                "status": "downloaded",
                "path": result.path,
                "message": f"Validated {result.shard_count} local weight shards.",
            },
            as_json=args.json,
        )
    return 0


def main() -> int:
    """Execute check, dry-run, or download mode and return a shell status code."""

    args = parser().parse_args()
    if args.check:
        result = inspect_model(args.destination)
        emit(
            {
                "status": "present" if result.present else "missing",
                "path": result.path,
                "missing": list(result.missing),
                "shard_count": result.shard_count,
                "message": "Local checkpoint is complete."
                if result.present
                else f"Missing: {', '.join(result.missing)}",
            },
            as_json=args.json,
        )
        return 0 if result.present else 1
    if args.dry_run:
        return dry_run(args)
    return download(args)


if __name__ == "__main__":
    raise SystemExit(main())
