#!/usr/bin/env python3
"""Create or update Alim's Conda environment for Linux or Apple Silicon macOS.

The base environment is shared.  This bootstrap then chooses the CUDA, Metal/
Accelerate, or CPU llama.cpp build after probing the actual host. Python API,
frontend Node packages and model runtime remain separate environments.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPOSITORY_ROOT / "backend"))

from app.model_spec import inspect_model
from app.platform import HostProfile, detect_host

BACKEND_ENVIRONMENT_NAME = "alim-backend"
MODEL_ENVIRONMENT_NAME = "alim-model-runtime"


def parser() -> argparse.ArgumentParser:
    """Build setup options without performing any environment changes."""

    value = argparse.ArgumentParser(description=__doc__)
    value.add_argument("--dry-run", action="store_true", help="Print commands without running them")
    value.add_argument(
        "--check", action="store_true", help="Only report host, tools, and model state"
    )
    value.add_argument(
        "--with-model",
        action="store_true",
        help="Also download the approximately 19 GiB Q4 model after setup",
    )
    value.add_argument(
        "--model-source",
        type=Path,
        help="Import an existing local GGUF during setup instead of using Hugging Face",
    )
    return value


def find_conda() -> str:
    """Locate Conda from an active shell or common Anaconda/Miniconda locations."""

    candidates = [
        os.getenv("CONDA_EXE"),
        shutil.which("conda"),
        str(Path.home() / "anaconda3" / "bin" / "conda"),
        str(Path.home() / "miniconda3" / "bin" / "conda"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise SystemExit("Conda was not found; install Miniforge/Anaconda or put conda on PATH")


def llama_matchspec(profile: HostProfile) -> str:
    """Return the conda-forge build selector matching detected acceleration."""

    return f"llama.cpp={profile.conda_llama_variant}"


def runtime_manifest(profile: HostProfile) -> Path:
    """Select one pinned model-runtime manifest for the measured host."""

    if profile.system == "Darwin":
        name = "environment-macos-metal.yml"
    elif profile.accelerator.value == "cuda":
        name = "environment-linux-cuda.yml"
    else:
        name = "environment-linux-cpu.yml"
    return REPOSITORY_ROOT / "backend" / "model-runtime" / name


def setup_commands(
    conda: str,
    profile: HostProfile,
    *,
    with_model: bool,
    model_source: Path | None = None,
) -> list[list[str]]:
    """Return the reproducible command sequence for the detected host."""

    commands = [
        [
            conda,
            "env",
            "update",
            "--name",
            BACKEND_ENVIRONMENT_NAME,
            "--file",
            str(REPOSITORY_ROOT / "backend" / "environment.yml"),
        ],
        [
            conda,
            "env",
            "update",
            "--name",
            MODEL_ENVIRONMENT_NAME,
            "--file",
            str(runtime_manifest(profile)),
        ],
        [
            conda,
            "run",
            "--name",
            BACKEND_ENVIRONMENT_NAME,
            "uv",
            "sync",
            "--project",
            str(REPOSITORY_ROOT / "backend"),
            "--extra",
            "dev",
            "--extra",
            "documents",
        ],
        ["npm", "ci", "--prefix", str(REPOSITORY_ROOT / "frontend")],
    ]
    if with_model or model_source is not None:
        model_command = [
            conda,
            "run",
            "--name",
            MODEL_ENVIRONMENT_NAME,
            "python",
            str(REPOSITORY_ROOT / "backend" / "scripts" / "model_runtime.py"),
        ]
        if model_source is not None:
            model_command.extend(["import", "--source", str(model_source.expanduser().resolve())])
        else:
            model_command.extend(["download", "--yes-download"])
        commands.append(model_command)
    return commands


def environment_report(conda: str, profile: HostProfile) -> dict[str, object]:
    """Collect non-mutating setup diagnostics suitable for support requests."""

    tools: dict[str, dict[str, object]] = {}
    commands = {
        "python": [conda, "run", "--name", BACKEND_ENVIRONMENT_NAME, "python", "--version"],
        "uv": [conda, "run", "--name", BACKEND_ENVIRONMENT_NAME, "uv", "--version"],
        "llama-server": [
            conda,
            "run",
            "--name",
            MODEL_ENVIRONMENT_NAME,
            "llama-server",
            "--version",
        ],
        "node": ["node", "--version"],
        "npm": ["npm", "--version"],
    }
    for name, command in commands.items():
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
        )
        tools[name] = {
            "available": result.returncode == 0,
            "version": (result.stdout or result.stderr).strip().splitlines()[:1],
        }
    return {
        "environments": {
            "backend": BACKEND_ENVIRONMENT_NAME,
            "model_runtime": MODEL_ENVIRONMENT_NAME,
            "frontend": "repository package manager",
        },
        "platform": profile.to_dict(),
        "llama_matchspec": llama_matchspec(profile),
        "tools": tools,
        "model": inspect_model().to_dict(),
    }


def main() -> int:
    """Detect the host and either report, preview, or perform setup."""

    options = parser().parse_args()
    profile = detect_host()
    conda = find_conda()
    if options.check:
        report = environment_report(conda, profile)
        print(json.dumps(report, indent=2, sort_keys=True))
        tool_statuses = report["tools"]
        assert isinstance(tool_statuses, dict)
        available = [
            bool(item.get("available")) for item in tool_statuses.values() if isinstance(item, dict)
        ]
        return 0 if available and all(available) else 1
    commands = setup_commands(
        conda,
        profile,
        with_model=options.with_model,
        model_source=options.model_source,
    )
    print(json.dumps({"detected_platform": profile.to_dict()}, indent=2))
    for command in commands:
        print(f"+ {shlex.join(command)}", flush=True)
        if not options.dry_run:
            subprocess.run(command, cwd=REPOSITORY_ROOT, check=True)
    print(f"Backend: conda activate {BACKEND_ENVIRONMENT_NAME}")
    print(f"Model runtime: conda activate {MODEL_ENVIRONMENT_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
