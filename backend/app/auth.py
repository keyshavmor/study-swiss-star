"""Supabase access-token verification for the local FastAPI boundary."""

from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Protocol


class AccessTokenVerifier(Protocol):
    """Validate one token and return only verified claims."""

    def verify(self, token: str) -> dict[str, Any]: ...


class TokenVerificationError(ValueError):
    """Raised when a token cannot be validated against the configured project."""


class SupabaseAccessTokenVerifier:
    """Validate access tokens with Supabase Auth and bind them to their JWT subject."""

    def __init__(self, url: str, publishable_key: str) -> None:
        if not url or not publishable_key:
            raise ValueError("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required")
        if publishable_key.startswith("sb_secret_"):
            raise ValueError("SUPABASE_PUBLISHABLE_KEY must not contain a secret key")
        self.url = url.rstrip("/")
        self.publishable_key = publishable_key

    @classmethod
    def from_env(cls) -> SupabaseAccessTokenVerifier:
        return cls(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
        )

    @staticmethod
    def _unverified_claims(token: str) -> dict[str, Any]:
        """Decode claims for comparison only; authorization waits for Auth verification."""

        parts = token.split(".")
        if len(parts) != 3:
            raise TokenVerificationError("Malformed bearer token")
        try:
            payload = parts[1] + "=" * (-len(parts[1]) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise TokenVerificationError("Malformed bearer token claims") from error
        if not isinstance(claims, dict):
            raise TokenVerificationError("Malformed bearer token claims")
        return claims

    def verify(self, token: str) -> dict[str, Any]:
        claims = self._unverified_claims(token)
        expected_issuer = f"{self.url}/auth/v1"
        if claims.get("iss") != expected_issuer:
            raise TokenVerificationError("Token was issued by a different Supabase project")
        audience = claims.get("aud")
        if audience != "authenticated" and not (
            isinstance(audience, list) and "authenticated" in audience
        ):
            raise TokenVerificationError("Token is not an authenticated-user token")
        if not isinstance(claims.get("sub"), str) or not claims["sub"]:
            raise TokenVerificationError("Token has no subject")
        if not isinstance(claims.get("exp"), (int, float)) or claims["exp"] <= time.time():
            raise TokenVerificationError("Token has expired")

        request = urllib.request.Request(
            f"{self.url}/auth/v1/user",
            headers={
                "apikey": self.publishable_key,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                user = json.loads(response.read().decode("utf-8"))
        except (
            urllib.error.HTTPError,
            urllib.error.URLError,
            TimeoutError,
            json.JSONDecodeError,
        ) as error:
            raise TokenVerificationError("Supabase rejected the bearer token") from error
        if not isinstance(user, dict) or user.get("id") != claims["sub"]:
            raise TokenVerificationError("Verified user does not match the token subject")
        return claims
