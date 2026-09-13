"""Unit tests for host detection and portable llama.cpp command construction."""

from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.model_spec import MODEL_FILENAME, MODEL_NAME
from app.platform import (
    GIB,
    Accelerator,
    PlatformError,
    context_window_from_env,
    detect_host,
    local_model_base_url,
)
from app.services.model_runtime import ModelRuntimeConfig, ModelRuntimeManager
from scripts.setup_environment import llama_matchspec, setup_commands


def completed(
    command: list[str], returncode: int, stdout: str = ""
) -> subprocess.CompletedProcess[str]:
    """Build a deterministic subprocess result for platform probes."""

    return subprocess.CompletedProcess(command, returncode, stdout, "")


class PlatformDetectionTests(unittest.TestCase):
    """Exercise Linux CUDA/fallback and Apple Silicon branches on any host."""

    def test_linux_with_24_gib_nvidia_uses_cuda_and_32k_context(self) -> None:
        """A 24 GiB NVIDIA host selects CUDA with a conservative 32K window."""

        def runner(command: list[str]) -> subprocess.CompletedProcess[str]:
            """Return the simulated NVIDIA VRAM probe result."""

            return completed(command, 0, "24576\n")

        profile = detect_host(system="Linux", machine="x86_64", runner=runner)
        self.assertEqual(profile.accelerator, Accelerator.CUDA)
        self.assertEqual(profile.accelerator_memory_bytes, 24 * GIB)
        self.assertEqual(profile.default_context_tokens, 32_768)
        self.assertEqual(profile.conda_llama_variant, "*=cuda*")

    def test_linux_without_working_nvidia_driver_falls_back_to_cpu(self) -> None:
        """Linux remains usable through CPU inference when NVIDIA probing fails."""

        profile = detect_host(
            system="Linux",
            machine="x86_64",
            runner=lambda command: completed(command, 9),
        )
        self.assertEqual(profile.accelerator, Accelerator.CPU)
        self.assertEqual(profile.default_context_tokens, 16_384)

    def test_48_gib_apple_silicon_uses_metal_and_64k_context(self) -> None:
        """The target M4 Pro profile selects Metal and a 64K context."""

        profile = detect_host(
            system="Darwin",
            machine="arm64",
            runner=lambda command: completed(command, 0, str(48 * GIB)),
        )
        self.assertEqual(profile.accelerator, Accelerator.METAL)
        self.assertEqual(profile.default_context_tokens, 65_536)
        self.assertEqual(profile.conda_llama_variant, "*=cpu_accelerate*")

    def test_intel_macos_is_rejected_with_actionable_message(self) -> None:
        """Unsupported Intel macOS fails with an explicit architecture message."""

        with self.assertRaisesRegex(PlatformError, "Apple Silicon"):
            detect_host(
                system="Darwin",
                machine="x86_64",
                runner=lambda command: completed(command, 0, str(48 * GIB)),
            )

    def test_context_override_cannot_exceed_native_model_window(self) -> None:
        """Operator overrides cannot exceed Qwen's native token capacity."""

        profile = detect_host(
            system="Linux",
            machine="x86_64",
            runner=lambda command: completed(command, 9),
        )
        with (
            patch.dict("os.environ", {"ALIM_MAX_CONTEXT_TOKENS": "999999"}),
            self.assertRaisesRegex(PlatformError, "between 4096"),
        ):
            context_window_from_env(profile)

    def test_model_url_follows_host_and_port_unless_explicitly_overridden(self) -> None:
        """All clients derive the same endpoint from host and port settings."""

        with patch.dict(
            "os.environ",
            {"ALIM_MODEL_HOST": "localhost", "ALIM_MODEL_PORT": "8123"},
            clear=True,
        ):
            self.assertEqual(local_model_base_url(), "http://localhost:8123/v1")
        with patch.dict(
            "os.environ",
            {"ALIM_LLM_BASE_URL": "http://example.invalid:9000/v1/"},
            clear=True,
        ):
            self.assertEqual(local_model_base_url(), "http://example.invalid:9000/v1")


class RuntimeCommandTests(unittest.TestCase):
    """Verify the managed server command remains portable and budget-aligned."""

    def test_llama_server_command_uses_local_model_alias_and_budget(self) -> None:
        """The managed command binds the local GGUF, alias, and context ceiling."""

        with tempfile.TemporaryDirectory() as directory:
            model_path = Path(directory) / "Qwen3.8-27B"
            config = ModelRuntimeConfig(
                model_path=model_path,
                max_model_len=32_768,
                executable="llama-server",
            )
            command = ModelRuntimeManager(config).build_command()
            self.assertEqual(command[0], "llama-server")
            self.assertEqual(
                command[command.index("--model") + 1], str(model_path / MODEL_FILENAME)
            )
            self.assertEqual(command[command.index("--alias") + 1], MODEL_NAME)
            self.assertEqual(command[command.index("--ctx-size") + 1], "32768")
            self.assertEqual(command[command.index("--parallel") + 1], "1")
            self.assertIn("--fit", command)

    def test_operator_command_override_is_preserved(self) -> None:
        """Advanced operators can replace the generated server command."""

        config = ModelRuntimeConfig(
            model_path=Path("models/Qwen3.8-27B"),
            command="custom-server --flag 'two words'",
        )
        self.assertEqual(
            ModelRuntimeManager(config).build_command(),
            ["custom-server", "--flag", "two words"],
        )


class EnvironmentSetupTests(unittest.TestCase):
    """Verify setup selects reproducible Conda variants for both target machines."""

    def test_cuda_and_metal_matchspecs_are_platform_specific(self) -> None:
        """Bootstrap commands select distinct CUDA and Accelerate builds."""

        linux = detect_host(
            system="Linux",
            machine="x86_64",
            runner=lambda command: completed(command, 0, "24576"),
        )
        mac = detect_host(
            system="Darwin",
            machine="arm64",
            runner=lambda command: completed(command, 0, str(48 * GIB)),
        )
        self.assertEqual(llama_matchspec(linux), "llama.cpp=*=cuda*")
        self.assertEqual(llama_matchspec(mac), "llama.cpp=*=cpu_accelerate*")
        commands = setup_commands("/conda", mac, with_model=True)
        self.assertIn("llama.cpp=*=cpu_accelerate*", commands[1])
        self.assertIn("download_qwen3_8_27b.py", commands[-1][-1])


if __name__ == "__main__":
    unittest.main()
