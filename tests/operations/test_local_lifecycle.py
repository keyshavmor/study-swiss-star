from __future__ import annotations

import os
import shutil
import socket
import subprocess
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
DEV = ROOT / "scripts" / "dev"
FAKE = ROOT / "tests" / "operations" / "fake_local_service.py"


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def run(script: str, action: str, env: dict[str, str], *, ok: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [str(DEV / script), action], cwd="/tmp", env=env,
        text=True, capture_output=True, timeout=20, check=False,
    )
    if ok and result.returncode:
        raise AssertionError(result.stdout + result.stderr)
    return result


@pytest.fixture
def lifecycle_env(tmp_path: Path) -> dict[str, str]:
    # A path containing spaces proves all state/cwd handling is quoted.
    state = tmp_path / "state with spaces"
    env = os.environ.copy()
    env["ALIM_LOCAL_STATE_ROOT"] = str(state)
    env["ALIM_HEALTH_TIMEOUT_SECONDS"] = "1"
    env["ALIM_STOP_TIMEOUT_SECONDS"] = "3"
    return env


def fake_command(port: int) -> str:
    return f"{shutil.which('python3')} {FAKE} --port {port}"


def test_frontend_repeated_lifecycle_stale_pid_and_cwd_independence(lifecycle_env: dict[str, str]) -> None:
    port = free_port()
    lifecycle_env.update(ALIM_FRONTEND_PORT=str(port), ALIM_FRONTEND_COMMAND=fake_command(port))
    state = Path(lifecycle_env["ALIM_LOCAL_STATE_ROOT"])
    try:
        run("frontend.sh", "start", lifecycle_env)
        run("frontend.sh", "start", lifecycle_env)
        assert "ready" in run("frontend.sh", "status", lifecycle_env).stdout
        run("frontend.sh", "health", lifecycle_env)
        run("frontend.sh", "stop", lifecycle_env)
        run("frontend.sh", "stop", lifecycle_env)
        (state / "run").mkdir(parents=True, exist_ok=True)
        (state / "run/frontend.pid").write_text("999999\n")
        (state / "run/frontend.token").write_text("stale\n")
        result = run("frontend.sh", "status", lifecycle_env, ok=False)
        assert result.returncode == 3 and "stopped" in result.stdout
        assert not (state / "run/frontend.pid").exists()
    finally:
        run("frontend.sh", "stop", lifecycle_env, ok=False)


def test_occupied_port_is_rejected_without_signalling_owner(lifecycle_env: dict[str, str]) -> None:
    port = free_port()
    owner = subprocess.Popen([shutil.which("python3"), str(FAKE), "--port", str(port)])
    lifecycle_env.update(ALIM_FRONTEND_PORT=str(port), ALIM_FRONTEND_COMMAND=fake_command(port))
    try:
        time.sleep(0.2)
        result = run("frontend.sh", "start", lifecycle_env, ok=False)
        assert result.returncode != 0 and "unowned" in result.stderr
        assert owner.poll() is None
    finally:
        owner.terminate()
        owner.wait(timeout=5)


def test_stack_hosted_mode_start_health_and_stop(lifecycle_env: dict[str, str]) -> None:
    supabase_port, backend_port, frontend_port = free_port(), free_port(), free_port()
    external = subprocess.Popen([shutil.which("python3"), str(FAKE), "--port", str(supabase_port)])
    lifecycle_env.update(
        ALIM_SUPABASE_MODE="hosted",
        ALIM_ALLOW_LOOPBACK_HOSTED_SUPABASE_TEST="1",
        ALIM_SUPABASE_HEALTH_URL=f"http://127.0.0.1:{supabase_port}/health",
        SUPABASE_PUBLISHABLE_KEY="synthetic-test-key",
        ALIM_ENABLE_AI="0",
        ALIM_BACKEND_PORT=str(backend_port),
        ALIM_FRONTEND_PORT=str(frontend_port),
        ALIM_BACKEND_COMMAND=fake_command(backend_port),
        ALIM_FRONTEND_COMMAND=fake_command(frontend_port),
    )
    try:
        output = run("stack.sh", "start", lifecycle_env).stdout
        assert f"http://127.0.0.1:{frontend_port}" in output
        assert "lovable" not in output.lower()
        run("stack.sh", "health", lifecycle_env)
        run("stack.sh", "stop", lifecycle_env)
        assert external.poll() is None
    finally:
        run("stack.sh", "stop", lifecycle_env, ok=False)
        external.terminate()
        external.wait(timeout=5)


def test_partial_failure_rolls_back_only_new_layers(lifecycle_env: dict[str, str]) -> None:
    supabase_port, backend_port, frontend_port = free_port(), free_port(), free_port()
    external = subprocess.Popen([shutil.which("python3"), str(FAKE), "--port", str(supabase_port)])
    lifecycle_env.update(
        ALIM_SUPABASE_MODE="hosted", ALIM_ALLOW_LOOPBACK_HOSTED_SUPABASE_TEST="1",
        ALIM_SUPABASE_HEALTH_URL=f"http://127.0.0.1:{supabase_port}/health",
        SUPABASE_PUBLISHABLE_KEY="synthetic-test-key",
        ALIM_ENABLE_AI="0", ALIM_BACKEND_PORT=str(backend_port),
        ALIM_FRONTEND_PORT=str(frontend_port), ALIM_BACKEND_COMMAND=fake_command(backend_port),
        ALIM_FRONTEND_COMMAND="exit 7", ALIM_FRONTEND_STARTUP_TIMEOUT_SECONDS="2",
    )
    try:
        result = run("stack.sh", "start", lifecycle_env, ok=False)
        assert result.returncode != 0
        assert run("backend.sh", "status", lifecycle_env, ok=False).returncode == 3
        assert external.poll() is None
    finally:
        run("stack.sh", "stop", lifecycle_env, ok=False)
        external.terminate()
        external.wait(timeout=5)


def test_non_loopback_and_missing_local_supabase_fail_closed(lifecycle_env: dict[str, str]) -> None:
    env = lifecycle_env | {"ALIM_FRONTEND_HOST": "0.0.0.0"}
    assert run("frontend.sh", "start", env, ok=False).returncode != 0
    env = lifecycle_env | {"ALIM_SUPABASE_MODE": "local", "PATH": "/usr/bin:/bin"}
    result = run("supabase.sh", "health", env, ok=False)
    assert result.returncode != 0
    env = lifecycle_env | {"ALIM_SUPABASE_MODE": "hosted", "SUPABASE_URL": "https://example.invalid"}
    result = run("supabase.sh", "health", env, ok=False)
    assert result.returncode != 0 and "SUPABASE_PUBLISHABLE_KEY" in result.stderr


def test_model_override_uses_same_owned_lifecycle(lifecycle_env: dict[str, str]) -> None:
    port = free_port()
    lifecycle_env.update(ALIM_MODEL_PORT=str(port), ALIM_MODEL_COMMAND=fake_command(port))
    try:
        run("model.sh", "start", lifecycle_env)
        run("model.sh", "health", lifecycle_env)
        assert "ready" in run("model.sh", "status", lifecycle_env).stdout
    finally:
        run("model.sh", "stop", lifecycle_env, ok=False)


def test_foreground_signal_cleans_only_started_layers(lifecycle_env: dict[str, str]) -> None:
    supabase_port, backend_port, frontend_port = free_port(), free_port(), free_port()
    external = subprocess.Popen([shutil.which("python3"), str(FAKE), "--port", str(supabase_port)])
    lifecycle_env.update(
        ALIM_SUPABASE_MODE="hosted", ALIM_ALLOW_LOOPBACK_HOSTED_SUPABASE_TEST="1",
        ALIM_SUPABASE_HEALTH_URL=f"http://127.0.0.1:{supabase_port}/health",
        SUPABASE_PUBLISHABLE_KEY="synthetic-test-key",
        ALIM_ENABLE_AI="0", ALIM_BACKEND_PORT=str(backend_port),
        ALIM_FRONTEND_PORT=str(frontend_port), ALIM_BACKEND_COMMAND=fake_command(backend_port),
        ALIM_FRONTEND_COMMAND=fake_command(frontend_port),
    )
    supervisor = subprocess.Popen(
        [str(DEV / "stack.sh"), "foreground"], cwd="/tmp", env=lifecycle_env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    try:
        deadline = time.monotonic() + 12
        while time.monotonic() < deadline:
            if run("backend.sh", "status", lifecycle_env, ok=False).returncode == 0 and run(
                "frontend.sh", "status", lifecycle_env, ok=False
            ).returncode == 0:
                break
            time.sleep(0.2)
        else:
            raise AssertionError("foreground stack did not become ready")
        supervisor.terminate()
        supervisor.wait(timeout=12)
        assert run("backend.sh", "status", lifecycle_env, ok=False).returncode == 3
        assert run("frontend.sh", "status", lifecycle_env, ok=False).returncode == 3
        assert external.poll() is None
    finally:
        if supervisor.poll() is None:
            supervisor.kill()
            supervisor.wait(timeout=5)
        run("stack.sh", "stop", lifecycle_env, ok=False)
        external.terminate()
        external.wait(timeout=5)
