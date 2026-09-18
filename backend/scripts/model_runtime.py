#!/usr/bin/env python3
"""Operate the isolated loopback model runtime without touching frontend packages."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import signal
import subprocess
import sys
from dataclasses import replace
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPOSITORY_ROOT / "backend"))

from app.artifact_store import ArtifactError, ArtifactStore
from app.model_registry import inspect_artifact, model_cache_root, resolve_model
from app.services.model_runtime import ModelRuntimeConfig, ModelRuntimeManager

DEFAULT_MODEL_ID = "Qwen/Qwen3.8-27B"


def state_root() -> Path:
    """Keep runtime ownership state outside Git."""

    configured = os.getenv("ALIM_RUNTIME_STATE_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()
    return model_cache_root().parent / "runtime"


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument(
        "action",
        choices=(
            "check",
            "command",
            "start",
            "stop",
            "status",
            "health",
            "download",
            "import",
        ),
    )
    value.add_argument("--model-id", default=DEFAULT_MODEL_ID)
    value.add_argument("--source", type=Path)
    value.add_argument("--yes-download", action="store_true")
    return value


def entry_and_path(model_id: str):
    entry = resolve_model(model_id)
    if entry is None:
        raise ArtifactError("model_id_not_allowlisted")
    store = ArtifactStore(model_cache_root())
    inspection = inspect_artifact(entry, store.root)
    return entry, store, inspection


def manager_for(model_id: str, model_path: Path) -> ModelRuntimeManager:
    config = ModelRuntimeConfig.from_env()
    return ModelRuntimeManager(
        replace(config, model_name=model_id, model_path=model_path.parent)
    )


async def start(model_id: str, model_path: Path) -> int:
    """Run a foreground controller so the caller/orchestrator owns its lifetime."""

    root = state_root()
    root.mkdir(parents=True, exist_ok=True)
    pid_file = root / "model-runtime.pid"
    if pid_file.exists():
        raise ArtifactError("runtime_pid_exists")
    pid_file.write_text(f"{os.getpid()}\n", encoding="ascii")
    os.chmod(pid_file, 0o600)
    manager = manager_for(model_id, model_path)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for name in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(name, stop.set)
    try:
        await manager.start()
        print(json.dumps({"status": "ready", "url": manager.config.base_url, "pid": os.getpid()}))
        await stop.wait()
    finally:
        await manager.stop()
        pid_file.unlink(missing_ok=True)
    return 0


def stop() -> int:
    """Signal only the controller recorded in the private runtime state directory."""

    pid_file = state_root() / "model-runtime.pid"
    try:
        pid = int(pid_file.read_text(encoding="ascii").strip())
        result = subprocess.run(
            ["ps", "-p", str(pid), "-o", "command="],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, ValueError, subprocess.SubprocessError):
        print(json.dumps({"status": "stopped", "message_code": "runtime_not_owned"}))
        return 0
    if result.returncode != 0 or "model_runtime.py" not in result.stdout:
        raise ArtifactError("runtime_pid_not_owned")
    os.kill(pid, signal.SIGTERM)
    print(json.dumps({"status": "stopping", "pid": pid}))
    return 0


async def main_async(args: argparse.Namespace) -> int:
    if args.action == "stop":
        return stop()
    entry, store, inspection = entry_and_path(args.model_id)
    if args.action == "import":
        if args.source is None:
            raise ArtifactError("import_source_required")
        path = await asyncio.to_thread(store.import_local, entry, args.source)
        print(json.dumps({"status": "verified", "path": str(path)}))
        return 0
    if args.action == "download":
        path = await asyncio.to_thread(
            store.download, entry, authorized=args.yes_download
        )
        print(json.dumps({"status": "verified", "path": str(path)}))
        return 0
    if inspection.state != "verified" or inspection.path is None:
        print(json.dumps({"status": inspection.state, "message_code": inspection.reason_code}))
        return 1
    model_path = Path(inspection.path)
    if args.action == "check":
        print(json.dumps({"status": "verified", "model_id": args.model_id}))
        return 0
    manager = manager_for(args.model_id, model_path)
    if args.action == "command":
        print(json.dumps({"command": manager.build_command()}))
        return 0
    if args.action == "start":
        return await start(args.model_id, model_path)
    ready = await manager.is_ready()
    payload = {
        "status": "ready" if ready else "stopped",
        "model_id": args.model_id,
        "artifact": inspection.state,
        "url": manager.config.base_url,
    }
    print(json.dumps(payload))
    return 0 if args.action == "status" or ready else 1


def main() -> int:
    args = parser().parse_args()
    try:
        return asyncio.run(main_async(args))
    except ArtifactError as error:
        print(json.dumps({"status": "error", "message_code": error.code}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
