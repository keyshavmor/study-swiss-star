#!/usr/bin/env python3
"""Start the preloaded model backend and frontend as one local process group."""

from __future__ import annotations

import os
import shlex
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPOSITORY_ROOT / "backend"))

from app.model_spec import inspect_model
from app.platform import detect_host


def command_from_env(name: str, fallback: list[str]) -> list[str]:
    """Parse a shell-style command override while retaining a safe default."""

    override = os.getenv(name)
    return shlex.split(override) if override else fallback


def require_executable(command: list[str]) -> None:
    """Fail early with the missing executable rather than a buried child-process error."""

    if not command or shutil.which(command[0]) is None:
        raise SystemExit(
            f"Required executable is unavailable: {command[0] if command else '<empty>'}"
        )


def main() -> int:
    """Validate local prerequisites, start both services, and coordinate shutdown."""

    profile = detect_host()
    print(
        "Detected "
        f"{profile.system}/{profile.machine} with {profile.accelerator.value}; "
        f"context window {profile.default_context_tokens} tokens",
        flush=True,
    )
    presence = inspect_model()
    if not presence.present:
        raise SystemExit(
            "Qwen3.8-27B is missing or incomplete. Run "
            "`uv run --project backend python models/download_qwen3_8_27b.py` first."
        )
    backend = command_from_env(
        "ALIM_BACKEND_COMMAND",
        [
            "uv",
            "run",
            "--project",
            "backend",
            "uvicorn",
            "app.main:app",
            "--app-dir",
            "backend",
            "--host",
            "127.0.0.1",
            "--port",
            "8001",
        ],
    )
    frontend = command_from_env("ALIM_FRONTEND_COMMAND", ["npm", "run", "dev"])
    require_executable(backend)
    require_executable(frontend)
    environment = os.environ.copy()
    environment.setdefault("ALIM_MODEL_AUTOSTART", "true")
    environment.setdefault("ALIM_CONTEXT_BACKEND_URL", "http://127.0.0.1:8001")
    log_root = REPOSITORY_ROOT / "logs"
    log_root.mkdir(parents=True, exist_ok=True)
    with (
        (log_root / "backend.log").open("ab") as backend_log,
        (log_root / "frontend.log").open("ab") as frontend_log,
    ):
        processes = [
            subprocess.Popen(
                backend,
                cwd=REPOSITORY_ROOT,
                env=environment,
                stdout=backend_log,
                stderr=subprocess.STDOUT,
            ),
            subprocess.Popen(
                frontend,
                cwd=REPOSITORY_ROOT / "frontend",
                env=environment,
                stdout=frontend_log,
                stderr=subprocess.STDOUT,
            ),
        ]

        def stop(_signal: int, _frame: object) -> None:
            """Forward termination to both child services."""

            for process in processes:
                if process.poll() is None:
                    process.terminate()

        signal.signal(signal.SIGINT, stop)
        signal.signal(signal.SIGTERM, stop)
        try:
            while all(process.poll() is None for process in processes):
                time.sleep(1)
        finally:
            stop(signal.SIGTERM, None)
            for process in processes:
                try:
                    process.wait(timeout=20)
                except subprocess.TimeoutExpired:
                    process.kill()
        return next((process.returncode or 0 for process in processes if process.returncode), 0)


if __name__ == "__main__":
    raise SystemExit(main())
