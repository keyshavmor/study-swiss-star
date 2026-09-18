"""Typed response contracts shared by implemented foundation endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .config import CONTRACT_VERSION


class LivenessResponse(BaseModel):
    """Process liveness only; it deliberately says nothing about model readiness."""

    status: Literal["ok"] = "ok"
    service: Literal["alim-local-backend"] = "alim-local-backend"
    version: str
    contract_version: str = CONTRACT_VERSION
    uptime_s: int = Field(ge=0)
    checked_at: str


class ReadinessCheck(BaseModel):
    """One truthful readiness probe with no user or filesystem detail."""

    ready: bool
    code: str


class ReadinessResponse(BaseModel):
    """Feature readiness kept separate from process liveness."""

    status: Literal["ready", "not_ready"]
    contract_version: str = CONTRACT_VERSION
    checks: dict[str, ReadinessCheck]
    checked_at: str
