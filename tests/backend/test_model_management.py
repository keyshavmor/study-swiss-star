"""Checkpoint presence, offline CLI, resume, and provenance tests."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from app.model_spec import (
    MODEL_FILENAME,
    inspect_model,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def make_checkpoint(path: Path) -> None:
    """Create the smallest filesystem fixture accepted by the GGUF presence check."""

    path.mkdir(parents=True, exist_ok=True)
    (path / MODEL_FILENAME).write_bytes(b"GGUF-test-placeholder")


class ModelManagementTests(unittest.TestCase):
    """Verify the downloader never reports success for incomplete local artifacts."""

    def test_presence_check_detects_missing_and_complete_checkpoints(self) -> None:
        """Presence changes only after a valid named GGUF appears."""

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Qwen3.8-27B"
            self.assertFalse(inspect_model(path).present)
            make_checkpoint(path)
            result = inspect_model(path)
            self.assertTrue(result.present)
            self.assertEqual(result.shard_count, 1)
            self.assertEqual(result.format, "gguf")

    def test_presence_check_rejects_a_non_gguf_file(self) -> None:
        """A renamed or truncated non-GGUF file must never pass startup validation."""

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Qwen3.8-27B"
            path.mkdir()
            (path / MODEL_FILENAME).write_bytes(b"not-a-gguf")
            result = inspect_model(path)
            self.assertFalse(result.present)
            self.assertTrue(any("GGUF header" in item for item in result.missing))

    def test_download_script_check_is_machine_readable_and_network_free(self) -> None:
        """The offline CLI truthfully reports an absent exact artifact."""

        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(
                [
                    sys.executable,
                    str(REPOSITORY_ROOT / "models" / "download_qwen3_8_27b.py"),
                    "--check",
                    "--json",
                ],
                check=False,
                capture_output=True,
                text=True,
                env=os.environ | {"ALIM_MODEL_CACHE_ROOT": directory},
            )
            self.assertEqual(result.returncode, 1, result.stderr)
            self.assertEqual(json.loads(result.stdout)["status"], "missing")

    def test_download_dry_run_exposes_only_reviewed_exact_metadata(self) -> None:
        """Dry-run does not contact the network and reports pinned integrity data."""

        result = subprocess.run(
            [
                sys.executable,
                str(REPOSITORY_ROOT / "models" / "download_qwen3_8_27b.py"),
                "--dry-run",
                "--json",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["revision"], "0669b98607d47046c7c2b3f801011d54a08cfccf")
        self.assertEqual(payload["bytes"], 18_973_870_432)
        self.assertEqual(payload["sha256"], "31629f53165ab6a7dad8c9847dcfd1fdf55829dac1e6e748f4a68581b0033d34")

    def test_local_import_rejects_a_renamed_tiny_file(self) -> None:
        """A GGUF header alone can never satisfy the reviewed mapping."""

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "portable-qwen.gguf"
            source.write_bytes(b"GGUF-offline-test-checkpoint")
            result = subprocess.run(
                [
                    sys.executable,
                    str(REPOSITORY_ROOT / "models" / "download_qwen3_8_27b.py"),
                    "--source-file",
                    str(source),
                    "--json",
                ],
                check=False,
                capture_output=True,
                text=True,
                env=os.environ | {"ALIM_MODEL_CACHE_ROOT": str(root / "models")},
            )
            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(json.loads(result.stdout)["message_code"], "artifact_size_mismatch")


if __name__ == "__main__":
    unittest.main()
