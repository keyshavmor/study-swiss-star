"""Truthful cross-platform capability measurement and model recommendation."""

from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

from .model_registry import MODEL_REGISTRY, MappingState, model_cache_root
from .platform import Accelerator, HostProfile, detect_host


class ProbeRunner(Protocol):
    """Injectable short command runner used only for hardware discovery."""

    def __call__(self, command: list[str]) -> subprocess.CompletedProcess[str]: ...


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=False, capture_output=True, text=True, timeout=5)


@dataclass(slots=True, frozen=True)
class ResourceMeasure:
    total: int | None
    available: int | None

    def bytes_dict(self) -> dict[str, int | None]:
        return {"total_bytes": self.total, "available_bytes": self.available}

    def readiness_dict(self) -> dict[str, int | float | None]:
        free_percent = (
            self.available * 100 / self.total
            if self.total and self.available is not None
            else None
        )
        return {
            "total_bytes": self.total,
            "free_bytes": self.available,
            "free_percent": free_percent,
        }


@dataclass(slots=True, frozen=True)
class CapabilitySnapshot:
    profile: HostProfile
    ram: ResourceMeasure
    storage: ResourceMeasure
    gpus: tuple[dict[str, Any], ...]
    measured_at: str
    quality: str

    def resource_snapshot(self) -> dict[str, object]:
        gpu = ResourceMeasure(None, None)
        if self.gpus:
            totals = [item.get("vram_total_bytes") for item in self.gpus]
            free = [item.get("vram_available_bytes") for item in self.gpus]
            gpu = ResourceMeasure(
                sum(value for value in totals if isinstance(value, int)) or None,
                sum(value for value in free if isinstance(value, int)) or None,
            )
        return {
            "gpu_vram": gpu.readiness_dict(),
            "ram": self.ram.readiness_dict(),
            "storage": self.storage.readiness_dict(),
        }


def _available_ram(profile: HostProfile, runner: ProbeRunner) -> int | None:
    if profile.system == "Linux":
        try:
            return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_AVPHYS_PAGES")
        except (OSError, ValueError):
            return None
    try:
        result = runner(["vm_stat"])
        if result.returncode != 0:
            return None
        page_size = 4096
        free_pages = 0
        for line in result.stdout.splitlines():
            if "page size of" in line:
                page_size = int(line.split("page size of", 1)[1].split("bytes", 1)[0].strip())
            if line.startswith(("Pages free:", "Pages inactive:", "Pages speculative:")):
                free_pages += int(line.rsplit(":", 1)[1].strip().rstrip("."))
        return free_pages * page_size
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def _nvidia_gpus(runner: ProbeRunner) -> tuple[dict[str, Any], ...]:
    try:
        result = runner(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.free,utilization.gpu",
                "--format=csv,noheader,nounits",
            ]
        )
    except (OSError, subprocess.SubprocessError):
        return ()
    if result.returncode != 0:
        return ()
    rows: list[dict[str, Any]] = []
    for line in result.stdout.splitlines():
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 5:
            continue
        try:
            rows.append(
                {
                    "gpu_id": parts[0],
                    "name": parts[1],
                    "vram_total_bytes": int(parts[2]) * 1024**2,
                    "vram_available_bytes": int(parts[3]) * 1024**2,
                    "accelerator": "cuda",
                    "unified_memory": False,
                    "utilisation_percent": float(parts[4]),
                }
            )
        except ValueError:
            continue
    return tuple(rows)


class SystemProbe:
    """Measure only values available from the local operating system."""

    def __init__(
        self,
        *,
        profile: HostProfile | None = None,
        runner: ProbeRunner = _run,
        storage_root: Path | None = None,
    ) -> None:
        self.profile = profile or detect_host(runner=runner)
        self.runner = runner
        self.storage_root = storage_root or model_cache_root()

    def measure(self) -> CapabilitySnapshot:
        ram = ResourceMeasure(
            self.profile.total_memory_bytes or None,
            _available_ram(self.profile, self.runner),
        )
        probe_path = self.storage_root
        while not probe_path.exists() and probe_path != probe_path.parent:
            probe_path = probe_path.parent
        try:
            disk = shutil.disk_usage(probe_path)
            storage = ResourceMeasure(disk.total, disk.free)
        except OSError:
            storage = ResourceMeasure(None, None)
        gpus = _nvidia_gpus(self.runner)
        if self.profile.accelerator is Accelerator.METAL:
            gpus = (
                {
                    "gpu_id": "metal-0",
                    "name": "Apple silicon GPU",
                    "vram_total_bytes": ram.total,
                    "vram_available_bytes": ram.available,
                    "accelerator": "metal",
                    "unified_memory": True,
                    "utilisation_percent": None,
                },
            )
        known = [ram.total, ram.available, storage.total, storage.available]
        quality = "measured" if all(value is not None for value in known) else "partial"
        return CapabilitySnapshot(
            profile=self.profile,
            ram=ram,
            storage=storage,
            gpus=gpus,
            measured_at=datetime.now(UTC).isoformat(),
            quality=quality,
        )

    @staticmethod
    def recommendation(snapshot: CapabilitySnapshot, allowed_ids: list[str]) -> dict[str, object]:
        alternatives: list[dict[str, object]] = []
        machine = snapshot.profile.machine.casefold()
        if snapshot.profile.system == "Darwin" and machine in {"arm64", "aarch64"}:
            platform_key = "macos-arm64-metal"
        elif snapshot.profile.system == "Linux" and machine in {"x86_64", "amd64"}:
            suffix = "cuda" if snapshot.profile.accelerator is Accelerator.CUDA else "cpu"
            platform_key = f"linux-x86_64-{suffix}"
        else:
            platform_key = "unsupported"
        for model_id in allowed_ids:
            entry = MODEL_REGISTRY.get(model_id)
            if entry is None or entry.mapping_state is not MappingState.VERIFIED:
                alternatives.append(
                    {
                        "model_id": model_id,
                        "estimated_bytes": None,
                        "headroom_fraction": None,
                        "reason_code": "artifact_mapping_unresolved",
                    }
                )
                continue
            if platform_key not in entry.supported_platforms:
                alternatives.append(
                    {
                        "model_id": model_id,
                        "estimated_bytes": entry.estimated_resident_bytes,
                        "headroom_fraction": None,
                        "reason_code": "unsupported_platform",
                    }
                )
                continue
            available = (
                max(
                    (
                        item["vram_available_bytes"]
                        for item in snapshot.gpus
                        if isinstance(item.get("vram_available_bytes"), int)
                    ),
                    default=0,
                )
                or snapshot.ram.available
            )
            estimate = entry.estimated_resident_bytes
            fits = bool(available and estimate and available >= estimate)
            alternatives.append(
                {
                    "model_id": model_id,
                    "estimated_bytes": estimate,
                    "headroom_fraction": (
                        max(0.0, (available - estimate) / available)
                        if fits and available and estimate
                        else None
                    ),
                    "reason_code": "fits_measured_resources" if fits else "insufficient_ram",
                }
            )
        fit = next((row for row in alternatives if row["reason_code"] == "fits_measured_resources"), None)
        return {
            "recommended_model_id": fit["model_id"] if fit else None,
            "alternatives": alternatives,
            "rationale_codes": ["measured_local_resources"] if fit else [],
            "fit": fit,
            "warning_codes": [] if fit else ["no_verified_model_fit"],
        }

    def report(self, allowed_ids: list[str], *, active_users: int, active_processes: int) -> dict[str, object]:
        snapshot = self.measure()
        os_name = "macOS" if snapshot.profile.system == "Darwin" else "Linux"
        mode = {
            Accelerator.CUDA: "gpu_only",
            Accelerator.METAL: "unified_memory",
            Accelerator.CPU: "cpu_only",
        }[snapshot.profile.accelerator]
        constraints = ["thermal_state_unavailable"]
        executable = os.getenv("ALIM_MODEL_SERVER_EXECUTABLE", "llama-server")
        if shutil.which(executable) is None:
            constraints.append("model_runtime_unavailable")
        return {
            "status": "ready",
            "active_user_count": active_users,
            "os": os_name,
            "architecture": snapshot.profile.machine,
            "ram": snapshot.ram.bytes_dict(),
            "gpus": list(snapshot.gpus),
            "runtime_storage": snapshot.storage.bytes_dict(),
            "load_balancing": {
                "mode": mode,
                "spare_capacity": max(0, 1 - active_processes),
                "active_model_processes": active_processes,
                "constraint_codes": constraints,
            },
            "recommendation": self.recommendation(snapshot, allowed_ids),
            "measured_at": snapshot.measured_at,
            "measurement_source": "local_backend_probe",
            "measurement_quality": snapshot.quality,
            "message_code": "capability_ready",
        }
