"""Structured application logging.

Sensitive keys (passwords, tokens, secrets) are redacted before a record is
emitted, so credentials can never leak into log files.
"""

from __future__ import annotations

import json
import logging
import re
import sys
from typing import Any

from app.config import settings

_SENSITIVE_PATTERNS = [
    re.compile(r'("?(?:password|passwd|pwd|secret|token|access_token|refresh_token|authorization|api_key|jwt_secret_key)"?\s*[:=]\s*")([^"]*)(")', re.I),
    re.compile(r"("
               r"(?:password|passwd|pwd|secret|token|access_token|refresh_token|authorization|api_key)"
               r"\s*[:=]\s*)([^\s,;)}\"']+)", re.I),
    re.compile(r"(Bearer\s+)([A-Za-z0-9._\-]+)", re.I),
]

REDACTED = "***redacted***"


def redact(text: str) -> str:
    """Replace credential-looking substrings with a placeholder."""
    out = text
    for pattern in _SENSITIVE_PATTERNS:
        if pattern.groups == 3:
            out = pattern.sub(lambda m: f"{m.group(1)}{REDACTED}{m.group(3)}", out)
        else:
            out = pattern.sub(lambda m: f"{m.group(1)}{REDACTED}", out)
    return out


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            message = record.getMessage()
        except Exception:  # pragma: no cover - defensive
            return True
        cleaned = redact(message)
        if cleaned != message:
            record.msg = cleaned
            record.args = ()
        return True


class JsonFormatter(logging.Formatter):
    """Minimal JSON log formatter (one object per line)."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": redact(record.getMessage()),
        }
        for key in ("request_id", "method", "path", "status_code", "duration_ms", "user_id", "event"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exception"] = redact(self.formatException(record.exc_info))
        return json.dumps(payload, default=str)


class ConsoleFormatter(logging.Formatter):
    default_fmt = "%(asctime)s | %(levelname)-8s | %(name)-28s | %(message)s"

    def __init__(self) -> None:
        super().__init__(self.default_fmt, datefmt="%H:%M:%S")

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        request_id = getattr(record, "request_id", None)
        if request_id:
            base = f"{base}  [req={request_id}]"
        return base


_configured = False


def configure_logging() -> None:
    """Idempotently configure root logging for the application."""
    global _configured
    if _configured:
        return

    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if settings.LOG_JSON else ConsoleFormatter())
    handler.addFilter(RedactingFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # Tame noisy third-party loggers.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("multipart").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.DB_ECHO else logging.WARNING
    )
    _configured = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
