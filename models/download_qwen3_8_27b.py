#!/usr/bin/env python3
"""Compatibility CLI for exact, checksum-verified Qwen3.8 acquisition.

The implementation is intentionally the same registry/artifact store used by
the API.  It cannot accept a caller-selected URL, revision, filename or hash.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "backend"))

from app.artifact_store import ArtifactError, ArtifactStore
from app.model_registry import inspect_artifact, model_cache_root, resolve_model

MODEL_ID = "Qwen/Qwen3.8-27B"


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    action = value.add_mutually_exclusive_group()
    action.add_argument("--check", action="store_true")
    action.add_argument("--dry-run", action="store_true")
    action.add_argument("--source-file", type=Path)
    value.add_argument(
        "--yes-download",
        action="store_true",
        help="Explicitly authorize the approximately 17.67 GiB network transfer",
    )
    value.add_argument("--json", action="store_true")
    return value


def emit(payload: dict[str, object], as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        for key, value in payload.items():
            print(f"{key}: {value}")


def main() -> int:
    args = parser().parse_args()
    entry = resolve_model(MODEL_ID)
    if entry is None:
        raise SystemExit("The reviewed Qwen3.8 mapping is unavailable")
    store = ArtifactStore(model_cache_root())
    if args.check:
        inspection = inspect_artifact(entry, store.root)
        emit(
            {
                "status": inspection.state,
                "message_code": inspection.reason_code,
                "path": inspection.path,
            },
            args.json,
        )
        return 0 if inspection.state == "verified" else 1
    if args.dry_run:
        emit(
            {
                "status": "download_required",
                "model_id": entry.model_id,
                "revision": entry.artifact_revision,
                "bytes": entry.expected_bytes,
                "sha256": entry.sha256,
                "url": store.source_url(entry),
            },
            args.json,
        )
        return 0
    try:
        path = (
            store.import_local(entry, args.source_file)
            if args.source_file is not None
            else store.download(entry, authorized=args.yes_download)
        )
    except ArtifactError as error:
        emit({"status": "error", "message_code": error.code}, args.json)
        return 2
    emit({"status": "verified", "path": str(path)}, args.json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
