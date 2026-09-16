"""Request logging middleware.

Assigns every request a correlation id, logs method/path/status/duration and
exposes the id via the `X-Request-ID` response header.
"""

from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging_config import get_logger

logger = get_logger("app.request")

# Paths that would otherwise flood the log with noise.
_QUIET_PATHS = {"/health", "/health/live", "/health/ready", "/favicon.ico", "/metrics"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.exception(
                "%s %s failed after %sms",
                request.method,
                request.url.path,
                duration_ms,
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                },
            )
            raise

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = str(duration_ms)

        if request.url.path not in _QUIET_PATHS:
            level = logger.warning if response.status_code >= 500 else logger.info
            level(
                "%s %s -> %s (%sms)",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "user_id": getattr(request.state, "user_id", None),
                },
            )
        return response
