"""Rate limiting and security-header middleware.

The limiter is an in-process sliding-window counter: correct for a single
worker and adequate for development/demo. For multi-worker or multi-instance
deployments swap `InMemoryRateLimitStore` for a Redis-backed store - the
interface is intentionally tiny so that change is local.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Protocol

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings


class RateLimitStore(Protocol):
    def hit(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int, float]:
        """Return `(allowed, remaining, retry_after_seconds)`."""


class InMemoryRateLimitStore:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int, float]:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(0.0, window_seconds - (now - bucket[0]))
                return False, 0, retry_after
            bucket.append(now)
            return True, max(0, limit - len(bucket)), 0.0


# Endpoints where brute-force protection matters more than throughput.
_STRICT_PREFIXES = ("/api/v1/auth/login", "/api/v1/auth/token", "/api/v1/auth/register")
_STRICT_LIMIT = 20
_EXEMPT_PATHS = {"/health", "/health/live", "/health/ready", "/docs", "/redoc", "/openapi.json"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, store: RateLimitStore | None = None) -> None:
        super().__init__(app)
        self.store = store or InMemoryRateLimitStore()

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.RATE_LIMIT_ENABLED or request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        path = request.url.path
        strict = path.startswith(_STRICT_PREFIXES)
        limit = _STRICT_LIMIT if strict else settings.RATE_LIMIT_REQUESTS
        bucket = "auth" if strict else "general"
        key = f"{bucket}:{self._client_key(request)}"

        allowed, remaining, retry_after = self.store.hit(
            key, limit, settings.RATE_LIMIT_WINDOW_SECONDS
        )
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please slow down and try again shortly.",
                        "details": {"retry_after_seconds": round(retry_after, 1)},
                    },
                },
                headers={"Retry-After": str(max(1, int(retry_after)))},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Conservative security headers suitable for an API + SPA deployment."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
        )
        if settings.ENVIRONMENT == "production":
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response
