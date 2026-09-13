"""Detect the host platform and choose safe local-inference defaults.

Alim supports Ubuntu/Debian on x86-64 and Apple Silicon macOS.  Platform
detection lives in this small module so setup, model serving, context budgeting,
health reporting, and tests all make the same decision.
"""

from __future__ import annotations

import os
import platform
import subprocess
from collections.abc import Callable
from dataclasses import asdict, dataclass
from enum import StrEnum

from .model_spec import NATIVE_CONTEXT_TOKENS

GIB = 1024**3


class PlatformError(RuntimeError):
    """Raised when Alim is started on an unsupported operating system or CPU."""


class Accelerator(StrEnum):
    """Hardware backend that llama.cpp should discover on the current host."""

    CUDA = "cuda"
    METAL = "metal"
    CPU = "cpu"


@dataclass(slots=True, frozen=True)
class HostProfile:
    """Normalized host capabilities used by setup and runtime configuration."""

    system: str
    machine: str
    accelerator: Accelerator
    total_memory_bytes: int
    accelerator_memory_bytes: int | None
    default_context_tokens: int
    conda_llama_variant: str

    def to_dict(self) -> dict[str, object]:
        """Return a JSON-serializable health/diagnostic representation."""

        value = asdict(self)
        value["accelerator"] = self.accelerator.value
        return value


CommandRunner = Callable[[list[str]], subprocess.CompletedProcess[str]]


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    """Run a short, read-only hardware probe without raising on failure."""

    return subprocess.run(command, check=False, capture_output=True, text=True, timeout=5)


def _physical_memory(system: str, runner: CommandRunner) -> int:
    """Read physical RAM using the native interface for Linux or macOS."""

    if system == "Darwin":
        try:
            result = runner(["sysctl", "-n", "hw.memsize"])
            if result.returncode == 0:
                return int(result.stdout.strip())
        except (OSError, ValueError, subprocess.SubprocessError):
            return 0
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    except (OSError, ValueError):
        return 0


def _nvidia_memory(runner: CommandRunner) -> int | None:
    """Return total NVIDIA VRAM, or ``None`` when CUDA is not currently usable."""

    try:
        result = runner(
            [
                "nvidia-smi",
                "--query-gpu=memory.total",
                "--format=csv,noheader,nounits",
            ]
        )
        if result.returncode != 0:
            return None
        values = [int(line.strip()) for line in result.stdout.splitlines() if line.strip()]
        return sum(values) * 1024**2 if values else None
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def _context_default(accelerator: Accelerator, memory_bytes: int) -> int:
    """Choose a conservative context size that leaves room for Q4 weights and KV cache."""

    if accelerator == Accelerator.METAL and memory_bytes >= 40 * GIB:
        return 65_536
    if accelerator == Accelerator.CUDA and memory_bytes >= 32 * GIB:
        return 65_536
    if accelerator == Accelerator.CUDA and memory_bytes >= 20 * GIB:
        return 32_768
    return 16_384


def detect_host(
    *,
    system: str | None = None,
    machine: str | None = None,
    runner: CommandRunner = _run,
) -> HostProfile:
    """Detect Linux CUDA/CPU or Apple-Silicon Metal and return shared defaults.

    ``system``, ``machine``, and ``runner`` are injectable so both platform
    branches can be tested on a single development machine.
    """

    detected_system = system or platform.system()
    detected_machine = (machine or platform.machine()).casefold()
    total_memory = _physical_memory(detected_system, runner)

    if detected_system == "Darwin":
        if detected_machine not in {"arm64", "aarch64"}:
            raise PlatformError("Alim supports macOS only on Apple Silicon (arm64)")
        accelerator = Accelerator.METAL
        accelerator_memory = total_memory or None
        variant = "*=cpu_accelerate*"
    elif detected_system == "Linux":
        if detected_machine not in {"x86_64", "amd64", "aarch64", "arm64"}:
            raise PlatformError(f"Unsupported Linux architecture: {detected_machine}")
        accelerator_memory = _nvidia_memory(runner)
        accelerator = Accelerator.CUDA if accelerator_memory else Accelerator.CPU
        variant = "*=cuda*" if accelerator == Accelerator.CUDA else "*=cpu*"
    else:
        raise PlatformError(
            f"Unsupported operating system: {detected_system}; use Ubuntu/Debian or Apple Silicon macOS"
        )

    budget_memory = accelerator_memory or total_memory
    return HostProfile(
        system=detected_system,
        machine=detected_machine,
        accelerator=accelerator,
        total_memory_bytes=total_memory,
        accelerator_memory_bytes=accelerator_memory,
        default_context_tokens=_context_default(accelerator, budget_memory),
        conda_llama_variant=variant,
    )


def context_window_from_env(profile: HostProfile | None = None) -> int:
    """Return the explicit override or the detected platform's safe context size."""

    value = os.getenv("ALIM_MAX_CONTEXT_TOKENS")
    try:
        tokens = (
            int(value) if value is not None else (profile or detect_host()).default_context_tokens
        )
    except ValueError as error:
        raise PlatformError("ALIM_MAX_CONTEXT_TOKENS must be an integer") from error
    if not 4_096 <= tokens <= NATIVE_CONTEXT_TOKENS:
        raise PlatformError(
            f"ALIM_MAX_CONTEXT_TOKENS must be between 4096 and {NATIVE_CONTEXT_TOKENS}"
        )
    return tokens


def local_model_base_url() -> str:
    """Return one shared model API URL, deriving it from host/port overrides."""

    host = os.getenv("ALIM_MODEL_HOST", "127.0.0.1")
    port = os.getenv("ALIM_MODEL_PORT", "8000")
    return os.getenv("ALIM_LLM_BASE_URL", f"http://{host}:{port}/v1").rstrip("/")
