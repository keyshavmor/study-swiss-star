"""Manage the cross-platform llama.cpp process that preloads Qwen at startup."""

from __future__ import annotations

import asyncio
import json
import os
import shlex
import shutil
import subprocess
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import IO, Any

from ..model_spec import (
    MODEL_NAME,
    default_model_file,
    default_model_path,
    inspect_model,
    repository_root,
)
from ..platform import HostProfile, context_window_from_env, detect_host, local_model_base_url


class ModelStartupError(RuntimeError):
    """Raised when the local checkpoint cannot become ready during app startup."""


@dataclass(slots=True, frozen=True)
class ModelRuntimeConfig:
    """Configuration for the managed, OpenAI-compatible llama.cpp server."""

    model_path: Path
    model_name: str = MODEL_NAME
    base_url: str = "http://127.0.0.1:8000/v1"
    host: str = "127.0.0.1"
    port: int = 8000
    max_model_len: int = 65_536
    startup_timeout_seconds: float = 1_800.0
    poll_seconds: float = 2.0
    log_path: Path = Path("logs/qwen3.8-27b-llama-server.log")
    command: str | None = None
    executable: str = "llama-server"
    host_profile: HostProfile | None = None
    threads: int = 1
    batch_size: int = 256
    gpu_layers: int = 0

    @classmethod
    def from_env(cls) -> ModelRuntimeConfig:
        """Build runtime settings after detecting Linux/CUDA or macOS/Metal."""

        profile = detect_host()
        host = os.getenv("ALIM_MODEL_HOST", "127.0.0.1")
        port = int(os.getenv("ALIM_MODEL_PORT", "8000"))
        default_threads = max(1, min(os.cpu_count() or 1, 16))
        accelerated = profile.accelerator.value in {"cuda", "metal"}
        return cls(
            model_path=Path(os.getenv("ALIM_MODEL_PATH", str(default_model_path()))),
            model_name=os.getenv("ALIM_LLM_MODEL", MODEL_NAME),
            base_url=local_model_base_url(),
            host=host,
            port=port,
            max_model_len=context_window_from_env(profile),
            startup_timeout_seconds=float(os.getenv("ALIM_MODEL_STARTUP_TIMEOUT_SECONDS", "1800")),
            poll_seconds=float(os.getenv("ALIM_MODEL_POLL_SECONDS", "2")),
            log_path=Path(
                os.getenv(
                    "ALIM_MODEL_SERVER_LOG",
                    str(repository_root() / "logs" / "qwen3.8-27b-llama-server.log"),
                )
            ),
            command=os.getenv("ALIM_MODEL_SERVER_COMMAND") or None,
            executable=os.getenv("ALIM_MODEL_SERVER_EXECUTABLE", "llama-server"),
            host_profile=profile,
            threads=int(os.getenv("ALIM_MODEL_THREADS", str(default_threads))),
            batch_size=int(os.getenv("ALIM_MODEL_BATCH_SIZE", "512" if accelerated else "256")),
            gpu_layers=int(os.getenv("ALIM_MODEL_GPU_LAYERS", "-1" if accelerated else "0")),
        )


class ModelRuntimeManager:
    """Own llama.cpp and report ready only after Qwen is resident and serving."""

    def __init__(self, config: ModelRuntimeConfig | None = None) -> None:
        """Create an idle manager; the model is loaded by :meth:`start`."""

        self.config = config or ModelRuntimeConfig.from_env()
        self.process: subprocess.Popen[bytes] | None = None
        self._log: IO[bytes] | None = None
        self.reused_existing_server = False

    async def start(self) -> None:
        """Validate the checkpoint, launch the server, and block until it is ready."""

        presence = inspect_model(self.config.model_path)
        if not presence.present:
            raise ModelStartupError(
                "Qwen3.8-27B is not complete at "
                f"{presence.path}; run the explicit model-runtime import/download first. "
                f"Missing: {', '.join(presence.missing)}"
            )
        if await self.is_ready():
            self.reused_existing_server = True
            return
        if self.config.command is None and shutil.which(self.config.executable) is None:
            raise ModelStartupError(
                f"{self.config.executable} is not installed. Run "
                "`python3 backend/scripts/setup_environment.py` and use the "
                "alim-model-runtime environment."
            )
        command = self.build_command()
        self.config.log_path.parent.mkdir(parents=True, exist_ok=True)
        self._log = self.config.log_path.open("ab")
        environment = os.environ.copy()
        environment.update(
            {
                "HF_HUB_OFFLINE": "1",
                "TRANSFORMERS_OFFLINE": "1",
                "HF_HUB_DISABLE_TELEMETRY": "1",
            }
        )
        self.process = await asyncio.to_thread(
            subprocess.Popen,
            command,
            cwd=str(self.config.model_path.parent),
            env=environment,
            stdout=self._log,
            stderr=subprocess.STDOUT,
        )
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self.config.startup_timeout_seconds
        while loop.time() < deadline:
            if self.process.poll() is not None:
                raise ModelStartupError(
                    f"llama-server exited with code {self.process.returncode}; "
                    f"see {self.config.log_path}"
                )
            if await self.is_ready():
                return
            await asyncio.sleep(self.config.poll_seconds)
        await self.stop()
        raise ModelStartupError(
            f"Qwen3.8-27B did not become ready within {self.config.startup_timeout_seconds:g}s; "
            f"see {self.config.log_path}"
        )

    async def stop(self) -> None:
        """Terminate only the model process started by this manager."""

        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            try:
                await asyncio.to_thread(self.process.wait, 20)
            except subprocess.TimeoutExpired:
                self.process.kill()
                await asyncio.to_thread(self.process.wait, 10)
        self.process = None
        if self._log is not None:
            self._log.close()
            self._log = None

    async def is_ready(self) -> bool:
        """Return whether the configured endpoint serves the expected model alias."""

        return await asyncio.to_thread(self._is_ready_sync)

    def build_command(self) -> list[str]:
        """Create the portable llama-server command, or honor an explicit test/operator override."""

        if self.config.command:
            return shlex.split(self.config.command)
        model_file = default_model_file()
        if self.config.model_path != default_model_path():
            model_file = self.config.model_path / model_file.name
        return [
            self.config.executable,
            "--model",
            str(model_file.resolve()),
            "--alias",
            self.config.model_name,
            "--host",
            self.config.host,
            "--port",
            str(self.config.port),
            "--ctx-size",
            str(self.config.max_model_len),
            "--parallel",
            "1",
            "--threads",
            str(max(1, self.config.threads)),
            "--batch-size",
            str(max(32, self.config.batch_size)),
            "--n-gpu-layers",
            str(max(-1, self.config.gpu_layers)),
            "--jinja",
            "--fit",
            "on",
            "--fit-ctx",
            "4096",
        ]

    def _is_ready_sync(self) -> bool:
        """Probe the local Models endpoint synchronously for use in a worker thread."""

        request = urllib.request.Request(f"{self.config.base_url}/models", method="GET")
        try:
            with urllib.request.urlopen(request, timeout=2.0) as response:
                payload: dict[str, Any] = json.loads(response.read().decode("utf-8"))
            return any(item.get("id") == self.config.model_name for item in payload.get("data", []))
        except (
            urllib.error.URLError,
            TimeoutError,
            json.JSONDecodeError,
            AttributeError,
            TypeError,
        ):
            return False

    def status(self) -> dict[str, Any]:
        """Return runtime and platform state without making another network request."""

        profile = self.config.host_profile or detect_host()
        return {
            "managed": True,
            "model_path": str(self.config.model_path.resolve()),
            "model_name": self.config.model_name,
            "max_model_len": self.config.max_model_len,
            "process_running": self.process is not None and self.process.poll() is None,
            "reused_existing_server": self.reused_existing_server,
            "engine": "llama.cpp",
            "tuning": {
                "threads": self.config.threads,
                "batch_size": self.config.batch_size,
                "gpu_layers": self.config.gpu_layers,
            },
            "platform": profile.to_dict(),
        }
