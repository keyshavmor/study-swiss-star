"""Canonical model identity and validation for Alim's local Qwen checkpoint."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

MODEL_REPOSITORY = "Qwen/Qwen3.8-27B"
MODEL_NAME = MODEL_REPOSITORY
MODEL_DIRECTORY_NAME = "Qwen3.8-27B"
MODEL_ARTIFACT_REPOSITORY = "ggml-org/Qwen3.8-27B-GGUF"
MODEL_FILENAME = "Qwen3.8-27B-Q4_K_M.gguf"
MODEL_QUANTIZATION = "Q4_K_M"
NATIVE_CONTEXT_TOKENS = 262_144
APP_CONTEXT_TOKENS = 65_536
RESERVED_OUTPUT_TOKENS = 16_384


def repository_root() -> Path:
    """Return the repository root independently of the current working directory."""

    return Path(__file__).resolve().parents[2]


def default_model_path() -> Path:
    """Return the repository-local directory reserved for Qwen model artifacts."""

    return repository_root() / "models" / MODEL_DIRECTORY_NAME


def default_model_file() -> Path:
    """Return the platform-portable quantized model file used by llama.cpp."""

    return default_model_path() / MODEL_FILENAME


@dataclass(slots=True, frozen=True)
class ModelPresence:
    """Result of validating all model files required by the runtime."""

    present: bool
    path: str
    repository: str
    missing: tuple[str, ...]
    shard_count: int
    format: str
    total_bytes: int

    def to_dict(self) -> dict[str, object]:
        """Return a JSON-serializable representation for CLI/API diagnostics."""

        return asdict(self)


def inspect_model(path: str | Path | None = None) -> ModelPresence:
    """Validate the Q4 GGUF artifact without opening the network or loading weights."""

    model_path = Path(path) if path else default_model_path()
    model_file = model_path / MODEL_FILENAME
    missing: list[str] = []
    if not model_file.is_file() or model_file.stat().st_size == 0:
        missing.append(MODEL_FILENAME)
    else:
        try:
            with model_file.open("rb") as handle:
                if handle.read(4) != b"GGUF":
                    missing.append(f"valid GGUF header in {MODEL_FILENAME}")
        except OSError:
            missing.append(f"readable {MODEL_FILENAME}")
    marker = model_path / ".alim-model.json"
    if marker.is_file():
        try:
            marker_repository = json.loads(marker.read_text(encoding="utf-8")).get("repository")
            if marker_repository != MODEL_REPOSITORY:
                missing.append(f"marker repository {MODEL_REPOSITORY}")
        except (json.JSONDecodeError, OSError, AttributeError):
            missing.append("valid .alim-model.json")
    return ModelPresence(
        present=model_path.is_dir() and not missing and model_file.is_file(),
        path=str(model_path.resolve()),
        repository=MODEL_REPOSITORY,
        missing=tuple(missing),
        shard_count=1 if not missing else 0,
        format="gguf",
        total_bytes=model_file.stat().st_size if model_file.is_file() else 0,
    )
