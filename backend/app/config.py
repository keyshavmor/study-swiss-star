"""Validated local-backend network and contract configuration."""

from __future__ import annotations

import ipaddress
import os
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import urlsplit

DEFAULT_FRONTEND_ORIGINS = ("http://127.0.0.1:8080", "http://localhost:8080")
DEFAULT_ALLOWED_HOSTS = ("127.0.0.1", "localhost", "[::1]")
CONTRACT_VERSION = "2026-09-18"


class ConfigurationError(ValueError):
    """Raised before startup when a trust-boundary setting is unsafe or malformed."""


def _enabled(value: str | None) -> bool:
    return (value or "").strip().casefold() in {"1", "true", "yes", "on"}


def _is_loopback(host: str | None) -> bool:
    if not host:
        return False
    if host.casefold() == "localhost":
        return True
    try:
        return ipaddress.ip_address(host.strip("[]")).is_loopback
    except ValueError:
        return False


def _parse_port(value: str) -> int:
    try:
        port = int(value)
    except ValueError as error:
        raise ConfigurationError("ALIM_BACKEND_PORT must be an integer") from error
    if not 1 <= port <= 65_535:
        raise ConfigurationError("ALIM_BACKEND_PORT must be between 1 and 65535")
    return port


def _parse_origins(raw: str | None, *, allow_remote: bool) -> tuple[str, ...]:
    candidates = DEFAULT_FRONTEND_ORIGINS if raw is None else tuple(raw.split(","))
    origins: list[str] = []
    for candidate in candidates:
        origin = candidate.strip().rstrip("/")
        if not origin:
            continue
        if origin == "*":
            raise ConfigurationError("Wildcard CORS origins are forbidden")
        parsed = urlsplit(origin)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
        ):
            raise ConfigurationError(f"Invalid CORS origin: {origin}")
        hostname = parsed.hostname.casefold()
        if "lovable" in hostname:
            raise ConfigurationError("Lovable origins cannot be local runtime CORS origins")
        if not allow_remote and not _is_loopback(hostname):
            raise ConfigurationError(
                "Non-loopback CORS origins require ALIM_ALLOW_REMOTE_FRONTEND_ORIGINS=true"
            )
        normalized = f"{parsed.scheme}://{parsed.netloc}"
        if normalized not in origins:
            origins.append(normalized)
    if not origins:
        raise ConfigurationError("At least one explicit CORS origin is required")
    return tuple(origins)


def _parse_hosts(raw: str | None, bind_host: str) -> tuple[str, ...]:
    candidates = DEFAULT_ALLOWED_HOSTS if raw is None else tuple(raw.split(","))
    hosts = [candidate.strip() for candidate in candidates if candidate.strip()]
    if "*" in hosts:
        raise ConfigurationError("Wildcard HTTP Host values are forbidden")
    if bind_host not in {"0.0.0.0", "::"} and bind_host not in hosts:
        hosts.append(bind_host)
    if not hosts:
        raise ConfigurationError("At least one explicit HTTP Host value is required")
    return tuple(dict.fromkeys(hosts))


@dataclass(frozen=True, slots=True)
class BackendSettings:
    """Network settings shared by the ASGI app and local launcher."""

    bind_host: str
    bind_port: int
    allowed_origins: tuple[str, ...]
    allowed_hosts: tuple[str, ...]
    contract_version: str = CONTRACT_VERSION

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> BackendSettings:
        env = os.environ if environ is None else environ
        bind_host = env.get("ALIM_BACKEND_HOST", "127.0.0.1").strip()
        if not bind_host:
            raise ConfigurationError("ALIM_BACKEND_HOST cannot be empty")
        if not _is_loopback(bind_host) and not _enabled(env.get("ALIM_ALLOW_NON_LOOPBACK")):
            raise ConfigurationError(
                "Non-loopback binding requires ALIM_ALLOW_NON_LOOPBACK=true and operator hardening"
            )
        port = _parse_port(env.get("ALIM_BACKEND_PORT", "8001"))
        origins = _parse_origins(
            env.get("ALIM_CORS_ALLOWED_ORIGINS"),
            allow_remote=_enabled(env.get("ALIM_ALLOW_REMOTE_FRONTEND_ORIGINS")),
        )
        hosts = _parse_hosts(env.get("ALIM_ALLOWED_HOSTS"), bind_host)
        return cls(
            bind_host=bind_host,
            bind_port=port,
            allowed_origins=origins,
            allowed_hosts=hosts,
        )
