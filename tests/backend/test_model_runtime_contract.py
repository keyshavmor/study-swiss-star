"""Prompt 04 model registry, artifact, capability, lease and API contracts."""

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from collections import namedtuple
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.artifact_store import ArtifactError, ArtifactStore
from app.main import create_app
from app.model_registry import (
    CATALOG_IDS,
    MODEL_REGISTRY,
    MappingState,
    ModelRegistryEntry,
)
from app.platform import Accelerator, HostProfile
from app.runtime_control import RuntimeCoordinator
from app.system_probe import CapabilitySnapshot, ResourceMeasure, SystemProbe
from httpx import ASGITransport, AsyncClient


class FixedProbe(SystemProbe):
    """Return one stable, fully measured local host."""

    def __init__(self, *, free: int = 64 * 1024**3) -> None:
        profile = HostProfile(
            system="Linux",
            machine="x86_64",
            accelerator=Accelerator.CUDA,
            total_memory_bytes=64 * 1024**3,
            accelerator_memory_bytes=48 * 1024**3,
            default_context_tokens=65_536,
            conda_llama_variant="*=cuda*",
        )
        self.snapshot = CapabilitySnapshot(
            profile=profile,
            ram=ResourceMeasure(64 * 1024**3, free),
            storage=ResourceMeasure(100 * 1024**3, free),
            gpus=(
                {
                    "gpu_id": "0",
                    "name": "fixture GPU",
                    "vram_total_bytes": 48 * 1024**3,
                    "vram_available_bytes": free,
                    "accelerator": "cuda",
                    "unified_memory": False,
                    "utilisation_percent": 0,
                },
            ),
            measured_at="2026-09-18T00:00:00+00:00",
            quality="measured",
        )

    def measure(self) -> CapabilitySnapshot:
        return self.snapshot

def fixture_entry(payload: bytes) -> ModelRegistryEntry:
    """Build a tiny reviewed entry for acquisition tests only."""

    return ModelRegistryEntry(
        model_id="Fixture/Tiny",
        display_name="Tiny",
        mapping_state=MappingState.VERIFIED,
        publisher_repository="Fixture/Tiny",
        license_id="Apache-2.0",
        artifact_repository="fixture/Tiny-GGUF",
        artifact_revision="a" * 40,
        filename="tiny.gguf",
        format="GGUF",
        quantization="test",
        expected_bytes=len(payload),
        sha256=hashlib.sha256(payload).hexdigest(),
        runtime="llama.cpp",
        supported_platforms=("linux-x86_64-cpu",),
    )


class Response:
    """Minimal streaming HTTP response fixture."""

    def __init__(self, payload: bytes, *, status: int = 200, headers=None) -> None:
        self.payload = payload
        self.status = status
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self, _size: int = -1) -> bytes:
        payload, self.payload = self.payload, b""
        return payload


class RegistryAndArtifactTests(unittest.TestCase):
    """Prove every UI ID resolves honestly and artifacts fail closed."""

    def test_registry_covers_exact_catalog_with_one_verified_mapping(self) -> None:
        self.assertEqual(tuple(MODEL_REGISTRY), tuple(row[0] for row in CATALOG_IDS))
        verified = [entry for entry in MODEL_REGISTRY.values() if entry.mapping_state == "verified"]
        self.assertEqual([entry.model_id for entry in verified], ["Qwen/Qwen3.8-27B"])
        entry = verified[0]
        self.assertEqual(entry.artifact_revision, "0669b98607d47046c7c2b3f801011d54a08cfccf")
        self.assertEqual(entry.expected_bytes, 18_973_870_432)
        self.assertEqual(entry.sha256, "31629f53165ab6a7dad8c9847dcfd1fdf55829dac1e6e748f4a68581b0033d34")

    def test_local_import_is_atomic_and_checksum_verified(self) -> None:
        payload = b"GGUFtiny-fixture"
        entry = fixture_entry(payload)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.gguf"
            source.write_bytes(payload)
            store = ArtifactStore(root / "cache")
            target = store.import_local(entry, source)
            self.assertEqual(target.read_bytes(), payload)
            marker = json.loads((target.parent / ".alim-model.json").read_text())
            self.assertEqual(marker["artifact_revision"], entry.artifact_revision)
            self.assertFalse(target.with_suffix(".gguf.partial").exists())

    def test_corrupt_import_disk_shortage_and_path_escape_fail_closed(self) -> None:
        payload = b"GGUFtiny-fixture"
        entry = fixture_entry(payload)
        disk = namedtuple("usage", "total used free")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.gguf"
            source.write_bytes(b"GGUFwrong")
            with self.assertRaisesRegex(ArtifactError, "artifact_size_mismatch"):
                ArtifactStore(root / "cache").import_local(entry, source)
            source.write_bytes(payload)
            with self.assertRaisesRegex(ArtifactError, "insufficient_storage"):
                ArtifactStore(root / "small", disk_usage=lambda _path: disk(1, 1, 0)).import_local(
                    entry, source
                )
            unsafe = replace(entry, filename="../../../../escape.gguf")
            with self.assertRaisesRegex(ValueError, "escapes"):
                ArtifactStore(root / "cache").import_local(unsafe, source)

    def test_resumed_download_requires_valid_range_and_supports_cancellation(self) -> None:
        payload = b"GGUFtiny-fixture"
        entry = fixture_entry(payload)
        requests = []

        def opener(request, _timeout):
            requests.append(request)
            return Response(
                payload[4:],
                status=206,
                headers={"Content-Range": f"bytes 4-{len(payload)-1}/{len(payload)}"},
            )

        with tempfile.TemporaryDirectory() as directory:
            store = ArtifactStore(Path(directory), opener=opener)
            target = Path(directory) / "Fixture--Tiny" / "tiny.gguf"
            target.parent.mkdir()
            target.with_suffix(".gguf.partial").write_bytes(payload[:4])
            self.assertEqual(store.download(entry, authorized=True).read_bytes(), payload)
            self.assertEqual(requests[0].get_header("Range"), "bytes=4-")

        with tempfile.TemporaryDirectory() as directory:
            store = ArtifactStore(Path(directory), opener=lambda _r, _t: Response(payload))
            with self.assertRaisesRegex(ArtifactError, "download_cancelled"):
                store.download(entry, authorized=True, cancelled=lambda: True)
            with self.assertRaisesRegex(ArtifactError, "download_not_authorized"):
                store.download(entry, authorized=False)


class CoordinatorTests(unittest.IsolatedAsyncioTestCase):
    """Exercise recommendation, leases, sharing, expiry and restart recovery."""

    async def test_admission_heartbeat_isolation_release_and_limit(self) -> None:
        coordinator = RuntimeCoordinator(probe=FixedProbe(), lease_seconds=30)
        policy = {"max_active_users": 1}
        admitted = await coordinator.admit("user-a", "Qwen/Qwen3.8-27B", policy)
        lease_id = admitted["lease"]["lease_id"]
        self.assertEqual(admitted["state"], "admitted")
        self.assertFalse(await coordinator.heartbeat("user-b", lease_id))
        denied = await coordinator.admit("user-b", None, policy)
        self.assertEqual(denied["state"], "denied_user_limit")
        self.assertFalse(await coordinator.release("user-b", lease_id))
        self.assertTrue(await coordinator.release("user-a", lease_id))

    async def test_lease_expiry_and_resource_denial(self) -> None:
        coordinator = RuntimeCoordinator(probe=FixedProbe(free=1), lease_seconds=30)
        denied = await coordinator.admit("user-a", None, {"max_active_users": 10})
        self.assertEqual(denied["state"], "denied_capacity")
        coordinator = RuntimeCoordinator(probe=FixedProbe(), lease_seconds=30)
        admitted = await coordinator.admit("user-a", None, {})
        lease_id = admitted["lease"]["lease_id"]
        coordinator.leases[lease_id]["expires_at"] = (
            datetime.now(UTC) - timedelta(seconds=1)
        ).isoformat()
        self.assertEqual(await coordinator.sweep(), 1)

        low_resource_prepare = await RuntimeCoordinator(probe=FixedProbe(free=1)).prepare(
            "user-a",
            "Qwen/Qwen3.8-27B",
            {"gpu_free_percent": 50, "ram_free_percent": 50, "storage_free_percent": 50},
            {"gpu_free_percent": 30, "ram_free_percent": 25, "storage_free_percent": 30},
            authorize_download=False,
        )
        self.assertEqual(low_resource_prepare["state"], "blocked")
        self.assertIn("insufficient_storage", low_resource_prepare["blocking_reasons"])

    async def test_unresolved_prepare_and_restart_recovery_are_typed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "runtime.json"
            coordinator = RuntimeCoordinator(probe=FixedProbe(), state_path=state)
            unresolved = await coordinator.prepare(
                "user-a", "Qwen/Qwen3-14B", {}, {}, authorize_download=False
            )
            self.assertEqual(unresolved["message_code"], "artifact_mapping_unresolved")
            coordinator.operations["op_interrupted"] = {
                "owner_user_ids": ["user-a"],
                "state": "loading",
            }
            coordinator._save()
            recovered = RuntimeCoordinator(probe=FixedProbe(), state_path=state)
            self.assertEqual(recovered.operations["op_interrupted"]["state"], "failed")
            self.assertEqual(
                recovered.operations["op_interrupted"]["message_code"],
                "operation_interrupted",
            )

    async def test_concurrent_prepare_joins_one_transient_operation(self) -> None:
        coordinator = RuntimeCoordinator(probe=FixedProbe())
        coordinator.operations["op_shared"] = {
            "operation_id": "op_shared",
            "owner_user_ids": ["user-a"],
            "model_id": "Qwen/Qwen3.8-27B",
            "state": "downloading",
            "shared_download": False,
        }
        joined = await coordinator.prepare(
            "user-b", "Qwen/Qwen3.8-27B", {}, {}, deduplicate_downloads=True
        )
        self.assertEqual(joined["operation_id"], "op_shared")
        self.assertTrue(joined["shared_download"])
        self.assertIsNotNone(await coordinator.operation("user-a", "op_shared"))
        self.assertIsNotNone(await coordinator.operation("user-b", "op_shared"))

    def test_macos_metal_recommendation_uses_same_verified_mapping(self) -> None:
        profile = HostProfile(
            system="Darwin",
            machine="arm64",
            accelerator=Accelerator.METAL,
            total_memory_bytes=48 * 1024**3,
            accelerator_memory_bytes=48 * 1024**3,
            default_context_tokens=65_536,
            conda_llama_variant="*=cpu_accelerate*",
        )
        snapshot = CapabilitySnapshot(
            profile=profile,
            ram=ResourceMeasure(48 * 1024**3, 40 * 1024**3),
            storage=ResourceMeasure(100 * 1024**3, 80 * 1024**3),
            gpus=(
                {
                    "vram_total_bytes": 48 * 1024**3,
                    "vram_available_bytes": 40 * 1024**3,
                },
            ),
            measured_at="fixture",
            quality="measured",
        )
        recommendation = SystemProbe.recommendation(snapshot, ["Qwen/Qwen3.8-27B"])
        self.assertEqual(recommendation["recommended_model_id"], "Qwen/Qwen3.8-27B")


class Verifier:
    """Map a deterministic token to its subject."""

    def verify(self, token: str):
        return {"sub": token}


class Model:
    """Small healthy local model double."""

    model = "fixture"

    async def status(self):
        return {"reachable": True, "model": self.model}


class RuntimeApiTests(unittest.IsolatedAsyncioTestCase):
    """Prove route authentication, shapes, and cross-user operation isolation."""

    async def test_capability_admission_prepare_and_operation_contracts(self) -> None:
        coordinator = RuntimeCoordinator(probe=FixedProbe())
        app = create_app(
            llm_client=Model(),
            auth_verifier=Verifier(),
            runtime_coordinator=coordinator,
        )
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://127.0.0.1"
        ) as client:
            self.assertEqual((await client.post("/api/system/capability", json={})).status_code, 401)
            headers = {"Authorization": "Bearer user-a", "X-Student-Id": "user-a"}
            capability = await client.post(
                "/api/system/capability",
                headers=headers,
                json={"model_catalog": ["Qwen/Qwen3.8-27B", "not-allowed"]},
            )
            self.assertEqual(capability.status_code, 200)
            self.assertEqual(capability.json()["status"], "ready")
            self.assertEqual(
                capability.json()["recommendation"]["recommended_model_id"],
                "Qwen/Qwen3.8-27B",
            )
            admission = await client.post(
                "/api/system/admission/check",
                headers=headers,
                json={"preferred_model_id": "Qwen/Qwen3.8-27B", "policy": {}},
            )
            self.assertEqual(admission.json()["state"], "admitted")
            prepared = await client.post(
                "/api/model/prepare",
                headers=headers,
                json={
                    "model_id": "Qwen/Qwen3-14B",
                    "admission_policy": {
                        "gpu_free_percent": 50,
                        "ram_free_percent": 50,
                        "storage_free_percent": 50,
                    },
                    "runtime_floors": {
                        "gpu_free_percent": 30,
                        "ram_free_percent": 25,
                        "storage_free_percent": 30,
                    },
                },
            )
            self.assertEqual(prepared.json()["state"], "blocked")
            operation_id = prepared.json()["operation_id"]
            foreign = await client.get(
                f"/api/model/operation/{operation_id}",
                headers={"Authorization": "Bearer user-b"},
            )
            self.assertEqual(foreign.status_code, 404)
            own = await client.get(
                f"/api/model/operation/{operation_id}", headers=headers
            )
            self.assertEqual(own.status_code, 200)
            self.assertEqual(own.json()["runtime_floors"]["ram_free_percent"], 25)


if __name__ == "__main__":
    unittest.main()
