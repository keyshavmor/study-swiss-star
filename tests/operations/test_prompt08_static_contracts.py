from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_docs_mirror_is_byte_identical() -> None:
    docs = {path.relative_to(ROOT / "docs") for path in (ROOT / "docs").rglob("*") if path.is_file()}
    mirror = {
        path.relative_to(ROOT / "lovabledocs")
        for path in (ROOT / "lovabledocs").rglob("*")
        if path.is_file()
    }
    assert docs == mirror
    for relative in docs:
        assert (ROOT / "docs" / relative).read_bytes() == (ROOT / "lovabledocs" / relative).read_bytes()


def test_archive_moves_are_scoped_and_recoverable() -> None:
    assert not (ROOT / "frontend/src/lib/store/demo-data.ts").exists()
    assert not (ROOT / "backend/scripts/start_app.py").exists()
    assert not (ROOT / "environment.yml").exists()
    assert not (ROOT / "frontend/package-lock.json").exists()
    expected = [
        ROOT / "frontend/archive/2026-09-20/demo-data.ts",
        ROOT / "frontend/archive/2026-09-20/ARCHIVE_MANIFEST.md",
        ROOT / "frontend/archive/2026-09-20/package-lock.json",
        ROOT / "backend/archive/2026-09-20/start_app.py",
        ROOT / "backend/archive/2026-09-20/legacy-root-environment.yml",
        ROOT / "backend/archive/2026-09-20/ARCHIVE_MANIFEST.md",
    ]
    assert all(path.is_file() for path in expected)
    assert "restor" in expected[1].read_text().lower()
    assert "restor" in expected[-1].read_text().lower()


def test_runtime_scripts_are_executable_local_and_lovable_free() -> None:
    scripts = list((ROOT / "scripts/dev").glob("*.sh")) + list((ROOT / "scripts/env").glob("*.sh"))
    assert scripts
    for script in scripts:
        assert os.access(script, os.X_OK), script
        text = script.read_text().lower()
        assert "lovable.app" not in text
        assert "lovableproject" not in text
    assert "http://127.0.0.1" in (ROOT / "scripts/dev/stack.sh").read_text()


def test_layer_pins_and_ignored_private_outputs() -> None:
    package = json.loads((ROOT / "frontend/package.json").read_text())
    assert package["packageManager"] == "bun@1.4.2"
    assert (ROOT / "frontend/.node-version").read_text().strip() == "22.23.2"
    assert (ROOT / "backend/.python-version").read_text().strip() == "3.11"
    assert (ROOT / "supabase/CLI_VERSION").read_text().strip() == "2.117.0"
    result = subprocess.run(
        ["git", "check-ignore", ".local/alim/run/frontend.pid", "backend/.env", "frontend/.env", "models/Qwen3.8-27B/model.gguf", "app-data/context/user.db"],
        cwd=ROOT, text=True, capture_output=True, check=True,
    )
    assert len(result.stdout.splitlines()) == 5


def test_platform_contract_is_truthful() -> None:
    ubuntu = (ROOT / "scripts/env/bootstrap_ubuntu.sh").read_text()
    macos = (ROOT / "scripts/env/bootstrap_macos.sh").read_text()
    assert "24.04|26.04" in ubuntu and "x86_64" in ubuntu and "aarch64" in ubuntu
    assert "arm64" in macos and "15" in macos and "26" in macos
    guide = (ROOT / "docs/operations/LOCAL_STACK_QUICKSTART.md").read_text()
    assert "Still requires physical proof" in guide and "macOS/M4" in guide
