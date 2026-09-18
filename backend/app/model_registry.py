"""Server-owned allowlist for frontend model IDs and reviewed local artifacts."""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass
from enum import StrEnum
from pathlib import Path


class MappingState(StrEnum):
    """Whether an enabled catalogue ID has a complete local runtime mapping."""

    VERIFIED = "verified"
    UNRESOLVED = "unresolved"


@dataclass(slots=True, frozen=True)
class ModelRegistryEntry:
    """Immutable reviewed model/runtime metadata; never populated from a request."""

    model_id: str
    display_name: str
    mapping_state: MappingState
    publisher_repository: str
    license_id: str | None = None
    artifact_repository: str | None = None
    artifact_revision: str | None = None
    filename: str | None = None
    format: str | None = None
    quantization: str | None = None
    expected_bytes: int | None = None
    sha256: str | None = None
    chat_template: str | None = None
    native_context_tokens: int | None = None
    runtime: str | None = None
    supported_platforms: tuple[str, ...] = ()
    estimated_resident_bytes: int | None = None

    def to_public_dict(self) -> dict[str, object]:
        """Return metadata safe for an authenticated local API response."""

        value = asdict(self)
        value["mapping_state"] = self.mapping_state.value
        return value


CATALOG_IDS = (
    ("Qwen/Qwen3.8-27B", "Qwen 3.8 27B"),
    ("Qwen/Qwen3.5-27B", "Qwen 3.5 27B"),
    ("Qwen/Qwen3-14B", "Qwen 3 14B"),
    ("Qwen/Qwen3.5-9B", "Qwen 3.5 9B"),
    ("Qwen/Qwen3-8B", "Qwen 3 8B"),
    ("Qwen/Qwen3.5-4B", "Qwen 3.5 4B"),
    ("Qwen/Qwen3-4B", "Qwen 3 4B"),
    ("Qwen/Qwen3.5-2B", "Qwen 3.5 2B"),
    ("Qwen/Qwen3-1.7B", "Qwen 3 1.7B"),
    ("Qwen/Qwen3-0.6B", "Qwen 3 0.6B"),
)

_QWEN38 = ModelRegistryEntry(
    model_id="Qwen/Qwen3.8-27B",
    display_name="Qwen 3.8 27B",
    mapping_state=MappingState.VERIFIED,
    publisher_repository="Qwen/Qwen3.8-27B",
    license_id="Apache-2.0",
    artifact_repository="ggml-org/Qwen3.8-27B-GGUF",
    artifact_revision="0669b98607d47046c7c2b3f801011d54a08cfccf",
    filename="Qwen3.8-27B-Q4_K_M.gguf",
    format="GGUF",
    quantization="Q4_K_M",
    expected_bytes=18_973_870_432,
    sha256="31629f53165ab6a7dad8c9847dcfd1fdf55829dac1e6e748f4a68581b0033d34",
    chat_template="embedded GGUF template from pinned Qwen source",
    native_context_tokens=262_144,
    runtime="llama.cpp",
    supported_platforms=("linux-x86_64-cpu", "linux-x86_64-cuda", "macos-arm64-metal"),
    estimated_resident_bytes=23_717_338_040,
)

MODEL_REGISTRY: dict[str, ModelRegistryEntry] = {_QWEN38.model_id: _QWEN38}
for _model_id, _display_name in CATALOG_IDS[1:]:
    MODEL_REGISTRY[_model_id] = ModelRegistryEntry(
        model_id=_model_id,
        display_name=_display_name,
        mapping_state=MappingState.UNRESOLVED,
        publisher_repository=_model_id,
    )


def model_cache_root() -> Path:
    """Return the dedicated model-data root, outside Git by default."""

    configured = os.getenv("ALIM_MODEL_CACHE_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()
    data_home = Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return (data_home / "alim" / "models").resolve()


def artifact_path(entry: ModelRegistryEntry, root: Path | None = None) -> Path | None:
    """Resolve a registry artifact beneath the dedicated cache root."""

    if not entry.filename:
        return None
    cache = (root or model_cache_root()).resolve()
    directory = entry.model_id.replace("/", "--")
    raw_candidate = cache / directory / entry.filename
    resolved_parent = raw_candidate.parent.resolve()
    if resolved_parent != cache and cache not in resolved_parent.parents:
        raise ValueError("Resolved model path escapes the model cache root")
    return resolved_parent / raw_candidate.name


@dataclass(slots=True, frozen=True)
class ArtifactInspection:
    """Checksum-backed local artifact state."""

    state: str
    path: str | None
    size_bytes: int | None
    sha256: str | None
    reason_code: str


def inspect_artifact(entry: ModelRegistryEntry, root: Path | None = None) -> ArtifactInspection:
    """Verify name, size, GGUF header, SHA-256 and provenance before use."""

    path = artifact_path(entry, root)
    if entry.mapping_state is not MappingState.VERIFIED or path is None:
        return ArtifactInspection("unresolved", None, None, None, "artifact_mapping_unresolved")
    if not path.is_file() or path.is_symlink():
        return ArtifactInspection("missing", str(path), None, None, "artifact_missing")
    size = path.stat().st_size
    if entry.expected_bytes is None or size != entry.expected_bytes:
        return ArtifactInspection("invalid", str(path), size, None, "artifact_size_mismatch")
    digest = hashlib.sha256()
    try:
        with path.open("rb") as handle:
            header = handle.read(4)
            if header != b"GGUF":
                return ArtifactInspection("invalid", str(path), size, None, "artifact_format_invalid")
            digest.update(header)
            for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
                digest.update(block)
    except OSError:
        return ArtifactInspection("invalid", str(path), size, None, "artifact_unreadable")
    actual = digest.hexdigest()
    if not entry.sha256 or actual != entry.sha256:
        return ArtifactInspection("invalid", str(path), size, actual, "artifact_checksum_mismatch")
    marker = path.parent / ".alim-model.json"
    try:
        provenance = json.loads(marker.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ArtifactInspection("invalid", str(path), size, actual, "provenance_missing")
    if (
        provenance.get("model_id") != entry.model_id
        or provenance.get("artifact_revision") != entry.artifact_revision
        or provenance.get("sha256") != entry.sha256
    ):
        return ArtifactInspection("invalid", str(path), size, actual, "provenance_mismatch")
    return ArtifactInspection("verified", str(path), size, actual, "artifact_verified")


def resolve_model(model_id: str) -> ModelRegistryEntry | None:
    """Resolve only exact allowlisted IDs."""

    return MODEL_REGISTRY.get(model_id)
