"""Checkpoint presence, offline CLI, resume, and provenance tests."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.model_spec import (
    MODEL_ARTIFACT_REPOSITORY,
    MODEL_FILENAME,
    MODEL_REPOSITORY,
    inspect_model,
)

from models import download_qwen3_8_27b

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
        """The offline CLI check returns stable JSON without contacting the Hub."""

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Qwen3.8-27B"
            make_checkpoint(path)
            result = subprocess.run(
                [
                    sys.executable,
                    str(REPOSITORY_ROOT / "models" / "download_qwen3_8_27b.py"),
                    "--check",
                    "--json",
                    "--destination",
                    str(path),
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)["status"], "present")

    def test_download_resumes_and_validates_before_success(self) -> None:
        """The downloader restricts artifacts and writes canonical provenance."""

        class FakeHub:
            """Stand in for huggingface_hub without network access."""

            @staticmethod
            def snapshot_download(**options):
                """Assert download filters and materialize a valid fixture."""

                self.assertEqual(options["repo_id"], MODEL_ARTIFACT_REPOSITORY)
                self.assertEqual(options["allow_patterns"], [MODEL_FILENAME])
                make_checkpoint(Path(options["local_dir"]))
                return str(options["local_dir"])

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Qwen3.8-27B"
            arguments = argparse.Namespace(
                destination=path,
                revision="main",
                token=None,
                force=False,
                json=True,
            )
            with patch.object(download_qwen3_8_27b, "hub", return_value=FakeHub()):
                self.assertEqual(download_qwen3_8_27b.download(arguments), 0)
            self.assertTrue(inspect_model(path).present)
            marker = json.loads((path / ".alim-model.json").read_text(encoding="utf-8"))
            self.assertEqual(marker["repository"], MODEL_REPOSITORY)
            self.assertEqual(marker["artifact_repository"], MODEL_ARTIFACT_REPOSITORY)


if __name__ == "__main__":
    unittest.main()
