#!/usr/bin/env python3
"""Create or update Alim's Conda environment for Linux or Apple Silicon macOS.

The base environment is shared.  This bootstrap then chooses the CUDA, Metal/
Accelerate, or CPU llama.cpp build after probing the actual host, and installs
the locked Python and frontend dependencies inside the same Conda environment.
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

ENVIRONMENT_NAME = "alim-study"


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


def setup_commands(conda: str, profile: HostProfile, *, with_model: bool) -> list[list[str]]:
    """Return the reproducible command sequence for the detected host."""

    commands = [
        [
            conda,
            "env",
            "update",
            "--name",
            ENVIRONMENT_NAME,
            "--file",
            str(REPOSITORY_ROOT / "environment.yml"),
        ],
        [
            conda,
            "install",
            "--name",
            ENVIRONMENT_NAME,
            "--channel",
            "conda-forge",
            "--yes",
            llama_matchspec(profile),
        ],
        [
            conda,
            "run",
            "--name",
            ENVIRONMENT_NAME,
            "uv",
            "sync",
            "--project",
            str(REPOSITORY_ROOT / "backend"),
            "--extra",
            "dev",
            "--extra",
            "documents",
            "--extra",
            "model-download",
        ],
        [
            conda,
            "run",
            "--name",
            ENVIRONMENT_NAME,
            "npm",
            "ci",
            "--prefix",
            str(REPOSITORY_ROOT / "frontend"),
        ],
    ]
    if with_model:
        commands.append(
            [
                conda,
                "run",
                "--name",
                ENVIRONMENT_NAME,
                "uv",
                "run",
                "--project",
                str(REPOSITORY_ROOT / "backend"),
                "python",
                str(REPOSITORY_ROOT / "models" / "download_qwen3_8_27b.py"),
            ]
        )
    return commands


def environment_report(conda: str, profile: HostProfile) -> dict[str, object]:
    """Collect non-mutating setup diagnostics suitable for support requests."""

    tools: dict[str, dict[str, object]] = {}
    for name, version_args in {
        "python": ["python", "--version"],
        "node": ["node", "--version"],
        "npm": ["npm", "--version"],
        "uv": ["uv", "--version"],
        "llama-server": ["llama-server", "--version"],
    }.items():
        result = subprocess.run(
            [conda, "run", "--name", ENVIRONMENT_NAME, *version_args],
            check=False,
            capture_output=True,
            text=True,
        )
        tools[name] = {
            "available": result.returncode == 0,
            "version": (result.stdout or result.stderr).strip().splitlines()[:1],
        }
    return {
        "environment": ENVIRONMENT_NAME,
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
    commands = setup_commands(conda, profile, with_model=options.with_model)
    print(json.dumps({"detected_platform": profile.to_dict()}, indent=2))
    for command in commands:
        print(f"+ {shlex.join(command)}", flush=True)
        if not options.dry_run:
            subprocess.run(command, cwd=REPOSITORY_ROOT, check=True)
    print(f"Activate with: conda activate {ENVIRONMENT_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
