"""Shared import-path setup for repository-level backend and model tests."""

from __future__ import annotations

import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
for path in (REPOSITORY_ROOT / "backend", REPOSITORY_ROOT):
    value = str(path)
    if value not in sys.path:
        sys.path.insert(0, value)
