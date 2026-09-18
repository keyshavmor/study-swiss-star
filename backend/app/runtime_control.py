"""Restart-safe local model operations and caller-scoped runtime leases."""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, ClassVar

from .artifact_store import ArtifactError, ArtifactStore
from .model_registry import MappingState, inspect_artifact, resolve_model
from .system_probe import CapabilitySnapshot, SystemProbe

RuntimeReady = Callable[[str], Awaitable[bool]]
RuntimePrepare = Callable[[str, Path], Awaitable[bool]]
RuntimeRelease = Callable[[], Awaitable[None]]


def _now() -> datetime:
    return datetime.now(UTC)


def _percent(total: int | None, free: int | None) -> float | None:
    return free * 100 / total if total and free is not None else None


class RuntimeCoordinator:
    """Coordinate one shared local runtime without fabricating readiness."""

    transient_states: ClassVar[set[str]] = {
        "checking_backend",
        "checking_resources",
        "checking_model",
        "queued",
        "downloading",
        "downloaded",
        "loading",
    }

    def __init__(
        self,
        *,
        probe: SystemProbe | None = None,
        state_path: Path | None = None,
        runtime_ready: RuntimeReady | None = None,
        runtime_prepare: RuntimePrepare | None = None,
        runtime_release: RuntimeRelease | None = None,
        artifact_store: ArtifactStore | None = None,
        lease_seconds: int = 90,
    ) -> None:
        self.probe = probe or SystemProbe()
        self.state_path = state_path
        self.runtime_ready = runtime_ready
        self.runtime_prepare = runtime_prepare
        self.runtime_release = runtime_release
        self.artifact_store = artifact_store
        self.lease_seconds = lease_seconds
        self.operations: dict[str, dict[str, Any]] = {}
        self.leases: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._load()

    def _load(self) -> None:
        if self.state_path is None or not self.state_path.is_file():
            return
        try:
            payload = json.loads(self.state_path.read_text(encoding="utf-8"))
            self.operations = dict(payload.get("operations", {}))
            self.leases = dict(payload.get("leases", {}))
        except (OSError, json.JSONDecodeError, TypeError, ValueError):
            self.operations = {}
            self.leases = {}
            return
        for operation in self.operations.values():
            if operation.get("state") in self.transient_states:
                operation.update(
                    state="failed",
                    progress_percent=None,
                    message_code="operation_interrupted",
                    retryable=True,
                    can_continue_with_ai=False,
                    blocking_reasons=["model_load_failed"],
                )
        self._expire()
        self._save()

    def _save(self) -> None:
        if self.state_path is None:
            return
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.state_path.with_suffix(self.state_path.suffix + ".tmp")
        temporary.write_text(
            json.dumps({"operations": self.operations, "leases": self.leases}, indent=2) + "\n",
            encoding="utf-8",
        )
        os.chmod(temporary, 0o600)
        os.replace(temporary, self.state_path)

    def _expire(self) -> None:
        now = _now()
        expired = [
            lease_id
            for lease_id, lease in self.leases.items()
            if datetime.fromisoformat(lease["expires_at"]) <= now
        ]
        for lease_id in expired:
            self.leases.pop(lease_id, None)

    def _active_users(self) -> int:
        self._expire()
        return len({lease["user_id"] for lease in self.leases.values()})

    @property
    def active_user_count(self) -> int:
        """Return the current lease count without exposing caller identity."""

        return self._active_users()

    def _lease_for_user(self, user_id: str) -> tuple[str, dict[str, Any]] | None:
        self._expire()
        return next(
            ((lease_id, row) for lease_id, row in self.leases.items() if row["user_id"] == user_id),
            None,
        )

    @staticmethod
    def _thresholds(policy: dict[str, Any]) -> dict[str, float]:
        return {
            "gpu_free_percent": float(policy.get("login_gpu_free_percent", 50)),
            "ram_free_percent": float(policy.get("login_ram_free_percent", 50)),
            "storage_free_percent": float(policy.get("login_storage_free_percent", 50)),
        }

    @staticmethod
    def _preparation_thresholds(policy: dict[str, Any]) -> dict[str, float]:
        return {
            "gpu_free_percent": float(policy.get("gpu_free_percent", 50)),
            "ram_free_percent": float(policy.get("ram_free_percent", 50)),
            "storage_free_percent": float(policy.get("storage_free_percent", 50)),
        }

    @staticmethod
    def _resource_block(
        snapshot: CapabilitySnapshot, thresholds: dict[str, float]
    ) -> str | None:
        ram = _percent(snapshot.ram.total, snapshot.ram.available)
        storage = _percent(snapshot.storage.total, snapshot.storage.available)
        gpu_values = [
            _percent(item.get("vram_total_bytes"), item.get("vram_available_bytes"))
            for item in snapshot.gpus
        ]
        gpu = max((value for value in gpu_values if value is not None), default=None)
        if storage is not None and storage < thresholds["storage_free_percent"]:
            return "insufficient_storage"
        if ram is not None and ram < thresholds["ram_free_percent"]:
            return "insufficient_ram"
        if gpu is not None and gpu < thresholds["gpu_free_percent"]:
            return "insufficient_gpu_vram"
        return None

    @staticmethod
    def _max_active_users(policy: dict[str, Any]) -> int:
        """Never let caller-supplied policy weaken the reviewed ten-user cap."""

        return max(1, min(int(policy.get("max_active_users", 10)), 10))

    async def admit(
        self, user_id: str, preferred_model_id: str | None, policy: dict[str, Any]
    ) -> dict[str, Any]:
        async with self._lock:
            snapshot = self.probe.measure()
            thresholds = self._thresholds(policy)
            existing = self._lease_for_user(user_id)
            if existing:
                lease_id, lease = existing
                lease["expires_at"] = (_now() + timedelta(seconds=self.lease_seconds)).isoformat()
                self._save()
                return self._admission_payload(
                    "admitted", lease_id, lease, snapshot, preferred_model_id, policy, "lease_reused"
                )
            if self._active_users() >= self._max_active_users(policy):
                return self._admission_payload(
                    "denied_user_limit", None, None, snapshot, preferred_model_id, policy,
                    "active_user_limit",
                )
            ram_free = _percent(snapshot.ram.total, snapshot.ram.available)
            storage_free = _percent(snapshot.storage.total, snapshot.storage.available)
            gpu_free_values = [
                _percent(item.get("vram_total_bytes"), item.get("vram_available_bytes"))
                for item in snapshot.gpus
            ]
            gpu_free = max((value for value in gpu_free_values if value is not None), default=None)
            insufficient = (
                (ram_free is not None and ram_free < thresholds["ram_free_percent"])
                or (storage_free is not None and storage_free < thresholds["storage_free_percent"])
                or (gpu_free is not None and gpu_free < thresholds["gpu_free_percent"])
            )
            if insufficient:
                return self._admission_payload(
                    "denied_capacity", None, None, snapshot, preferred_model_id, policy,
                    "insufficient_resources",
                )
            lease_id = f"lease_{uuid.uuid4().hex}"
            lease = {
                "user_id": user_id,
                "preferred_model_id": preferred_model_id,
                "assigned_model_id": None,
                "expires_at": (_now() + timedelta(seconds=self.lease_seconds)).isoformat(),
            }
            self.leases[lease_id] = lease
            self._save()
            return self._admission_payload(
                "admitted", lease_id, lease, snapshot, preferred_model_id, policy, "admitted"
            )

    def _admission_payload(
        self,
        state: str,
        lease_id: str | None,
        lease: dict[str, Any] | None,
        snapshot: CapabilitySnapshot,
        preferred_model_id: str | None,
        policy: dict[str, Any],
        message_code: str,
    ) -> dict[str, Any]:
        preferred = resolve_model(preferred_model_id) if preferred_model_id else None
        allowed = [preferred.model_id] if preferred else []
        recommendation = self.probe.recommendation(snapshot, allowed)
        return {
            "state": state,
            "lease": (
                {
                    "lease_id": lease_id,
                    "expires_at": lease["expires_at"],
                    "heartbeat_interval_seconds": max(10, self.lease_seconds // 3),
                }
                if lease_id and lease
                else None
            ),
            "active_user_count": self._active_users(),
            "max_active_users": self._max_active_users(policy),
            "queue_position": None,
            "queue_size": 0,
            "resources": snapshot.resource_snapshot(),
            "login_thresholds": self._thresholds(policy),
            "preferred_model_id": preferred_model_id,
            "assigned_model_id": lease.get("assigned_model_id") if lease else None,
            "recommended_model_id": recommendation["recommended_model_id"],
            "recommendation_reason_code": (
                recommendation["rationale_codes"][0] if recommendation["rationale_codes"] else None
            ),
            "rebalance_needed": False,
            "rebalance_in_progress": False,
            "retry_at": None,
            "message_code": message_code,
            "retryable": state != "denied_user_limit",
        }

    async def heartbeat(self, user_id: str, lease_id: str) -> bool:
        async with self._lock:
            self._expire()
            lease = self.leases.get(lease_id)
            if lease is None or lease["user_id"] != user_id:
                return False
            lease["expires_at"] = (_now() + timedelta(seconds=self.lease_seconds)).isoformat()
            self._save()
            return True

    async def release(self, user_id: str, lease_id: str | None) -> bool:
        async with self._lock:
            candidates = [lease_id] if lease_id else [
                key for key, row in self.leases.items() if row["user_id"] == user_id
            ]
            released = False
            for candidate in candidates:
                if candidate and self.leases.get(candidate, {}).get("user_id") == user_id:
                    self.leases.pop(candidate, None)
                    released = True
            self._save()
        if released and not self.leases and self.runtime_release is not None:
            await self.runtime_release()
        return released

    async def sweep(self) -> int:
        """Expire abandoned leases and release an idle owned runtime."""

        async with self._lock:
            before = len(self.leases)
            self._expire()
            expired = before - len(self.leases)
            idle = not self.leases
            if expired:
                self._save()
        if expired and idle and self.runtime_release is not None:
            await self.runtime_release()
        return expired

    async def prepare(
        self,
        user_id: str,
        model_id: str,
        admission_policy: dict[str, Any],
        runtime_floors: dict[str, Any],
        *,
        authorize_download: bool = True,
        deduplicate_downloads: bool = True,
    ) -> dict[str, Any]:
        async with self._lock:
            if deduplicate_downloads:
                existing = next(
                    (
                        row
                        for row in self.operations.values()
                        if row.get("model_id") == model_id
                        and row.get("state") in self.transient_states
                    ),
                    None,
                )
                if existing is not None:
                    owners = set(existing.get("owner_user_ids", []))
                    owners.add(user_id)
                    existing["owner_user_ids"] = sorted(owners)
                    existing["shared_download"] = True
                    self._save()
                    return self._public_operation(existing)
            operation_id = f"op_{uuid.uuid4().hex}"
            entry = resolve_model(model_id)
            snapshot = self.probe.measure()
            admission = self._preparation_thresholds(admission_policy)
            resource_block = self._resource_block(snapshot, admission)
            base = {
                "operation_id": operation_id,
                "owner_user_ids": [user_id],
                "model_id": model_id,
                "progress_percent": None,
                "model_download_in_progress": False,
                "shared_download": False,
                "active_user_count": self._active_users(),
                "resources": snapshot.resource_snapshot(),
                "can_start_new_allocation": False,
                "can_continue_with_ai": False,
                "can_continue_without_ai": True,
                "retryable": False,
                "created_at": _now().isoformat(),
            }
            if entry is None:
                operation = base | {
                    "state": "blocked",
                    "message_code": "model_id_not_allowlisted",
                    "model_present_on_disk": False,
                    "blocking_reasons": ["model_not_available"],
                }
            elif entry.mapping_state is MappingState.UNRESOLVED:
                operation = base | {
                    "state": "blocked",
                    "message_code": "artifact_mapping_unresolved",
                    "model_present_on_disk": False,
                    "blocking_reasons": ["model_not_available"],
                }
            elif resource_block is not None:
                operation = base | {
                    "state": "blocked",
                    "message_code": resource_block,
                    "model_present_on_disk": None,
                    "blocking_reasons": [resource_block],
                    "retryable": True,
                }
            else:
                inspection = inspect_artifact(
                    entry,
                    self.artifact_store.root if self.artifact_store else None,
                )
                if inspection.state == "missing" and self.artifact_store and authorize_download:
                    operation = base | {
                        "state": "downloading",
                        "message_code": "model_download_started",
                        "model_present_on_disk": False,
                        "model_download_in_progress": True,
                        "blocking_reasons": [],
                        "retryable": True,
                    }
                elif inspection.state != "verified":
                    reason = (
                        "download_failed" if inspection.state == "invalid" else "model_not_available"
                    )
                    operation = base | {
                        "state": "blocked",
                        "message_code": inspection.reason_code,
                        "model_present_on_disk": inspection.state != "missing",
                        "blocking_reasons": [reason],
                        "retryable": True,
                    }
                else:
                    ready = bool(self.runtime_ready and await self.runtime_ready(model_id))
                    runtime_block = self._resource_block(
                        self.probe.measure(),
                        self._preparation_thresholds(runtime_floors),
                    )
                    ready = ready and runtime_block is None
                    operation = base | {
                        "state": "ready" if ready else "blocked",
                        "progress_percent": 100 if ready else None,
                        "message_code": (
                            "model_ready"
                            if ready
                            else runtime_block or "model_runtime_not_ready"
                        ),
                        "model_present_on_disk": True,
                        "can_start_new_allocation": True,
                        "can_continue_with_ai": ready,
                        "blocking_reasons": (
                            [] if ready else [runtime_block or "model_load_failed"]
                        ),
                        "retryable": not ready,
                    }
            operation["admission"] = admission
            operation["runtime_floors"] = self._preparation_thresholds(runtime_floors)
            self.operations[operation_id] = operation
            self._save()
            public = self._public_operation(operation)
            if operation["state"] == "downloading":
                asyncio.create_task(self._acquire_and_prepare(operation_id, entry))
            return public

    async def _acquire_and_prepare(self, operation_id: str, entry: Any) -> None:
        """Run one registry-owned download and runtime load in the background."""

        assert self.artifact_store is not None

        def progress(written: int, total: int) -> None:
            row = self.operations.get(operation_id)
            if row is not None:
                row["progress_percent"] = round(written * 100 / total, 2)

        try:
            path = await asyncio.to_thread(
                self.artifact_store.download,
                entry,
                authorized=True,
                progress=progress,
            )
            async with self._lock:
                row = self.operations[operation_id]
                row.update(
                    state="loading",
                    progress_percent=100,
                    model_present_on_disk=True,
                    model_download_in_progress=False,
                    message_code="model_loading",
                )
                self._save()
            ready = bool(
                self.runtime_prepare
                and await self.runtime_prepare(entry.model_id, path)
                and self.runtime_ready
                and await self.runtime_ready(entry.model_id)
            )
            fresh = self.probe.measure()
            runtime_block = self._resource_block(
                fresh, self.operations[operation_id]["runtime_floors"]
            )
            ready = ready and runtime_block is None
            async with self._lock:
                row = self.operations[operation_id]
                row.update(
                    state="ready" if ready else "blocked",
                    can_start_new_allocation=ready,
                    can_continue_with_ai=ready,
                    blocking_reasons=(
                        [] if ready else [runtime_block or "model_load_failed"]
                    ),
                    message_code=(
                        "model_ready" if ready else runtime_block or "model_runtime_not_ready"
                    ),
                    retryable=not ready,
                )
                self._save()
        except ArtifactError as error:
            blocking = (
                "insufficient_storage"
                if error.code == "insufficient_storage"
                else "download_failed"
            )
            async with self._lock:
                row = self.operations[operation_id]
                row.update(
                    state="failed",
                    progress_percent=None,
                    model_download_in_progress=False,
                    message_code=error.code,
                    blocking_reasons=[blocking],
                    retryable=True,
                )
                self._save()
        except (OSError, RuntimeError, TimeoutError, ValueError):
            async with self._lock:
                row = self.operations[operation_id]
                row.update(
                    state="failed",
                    progress_percent=None,
                    model_download_in_progress=False,
                    message_code="model_load_failed",
                    blocking_reasons=["model_load_failed"],
                    retryable=True,
                )
                self._save()

    @staticmethod
    def _public_operation(operation: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in operation.items() if key != "owner_user_ids"}

    async def operation(self, user_id: str, operation_id: str) -> dict[str, Any] | None:
        async with self._lock:
            row = self.operations.get(operation_id)
            if row is None or user_id not in row.get("owner_user_ids", []):
                return None
            return self._public_operation(row)

    async def health(self, user_id: str, policy: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            snapshot = self.probe.measure()
            mine = self._lease_for_user(user_id)
            preferred_id = mine[1].get("preferred_model_id") if mine else None
            preferred = resolve_model(preferred_id) if preferred_id else None
            recommendation = self.probe.recommendation(
                snapshot, [preferred.model_id] if preferred else []
            )
            gpus = []
            for gpu in snapshot.gpus:
                total = gpu.get("vram_total_bytes")
                free = gpu.get("vram_available_bytes")
                gpus.append(
                    {
                        "gpu_id": gpu.get("gpu_id", "gpu"),
                        "name": gpu.get("name"),
                        "total_vram_bytes": total,
                        "free_vram_bytes": free,
                        "used_vram_bytes": total - free if isinstance(total, int) and isinstance(free, int) else None,
                        "utilisation_percent": gpu.get("utilisation_percent"),
                        "instances": [],
                    }
                )
            def usage(measure: Any) -> dict[str, Any]:
                used = (
                    measure.total - measure.available
                    if measure.total and measure.available is not None
                    else None
                )
                return {
                    "total_bytes": measure.total,
                    "free_bytes": measure.available,
                    "used_bytes": used,
                    "used_percent": (used * 100 / measure.total if used is not None and measure.total else None),
                }
            return {
                "active_user_count": self._active_users(),
                "max_active_users": self._max_active_users(policy),
                "queue_size": 0,
                "my_queue_position": None,
                "gpus": gpus,
                "ram": usage(snapshot.ram),
                "disk": usage(snapshot.storage),
                "rebalance_state": "idle",
                "recommended_model_id": recommendation["recommended_model_id"],
                "recommendation_reason_code": (
                    recommendation["rationale_codes"][0] if recommendation["rationale_codes"] else None
                ),
                "my_preferred_model_id": mine[1].get("preferred_model_id") if mine else None,
                "my_assigned_model_id": mine[1].get("assigned_model_id") if mine else None,
                "message_code": "ok",
            }
