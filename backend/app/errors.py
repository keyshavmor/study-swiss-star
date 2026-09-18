"""Stable, bounded API errors for the local backend trust boundary."""

from __future__ import annotations

import re

from fastapi.responses import JSONResponse

from .config import CONTRACT_VERSION

_CODE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class ApiError(RuntimeError):
    """An intentionally public error with a bounded machine code."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        *,
        retryable: bool = False,
    ) -> None:
        if not 400 <= status <= 599:
            raise ValueError("API error status must be between 400 and 599")
        if not _CODE.fullmatch(code):
            raise ValueError("API error code must be bounded snake_case")
        super().__init__(message[:240])
        self.status = status
        self.code = code
        self.retryable = retryable


def error_response(error: ApiError, request_id: str) -> JSONResponse:
    """Render the one public error envelope without exception/provider detail."""

    return JSONResponse(
        status_code=error.status,
        content={
            "error": {
                "code": error.code,
                "message": str(error),
                "retryable": error.retryable,
                "request_id": request_id,
            }
        },
        headers={
            "Cache-Control": "no-store",
            "X-Request-Id": request_id,
            "X-Alim-Contract-Version": CONTRACT_VERSION,
        },
    )
