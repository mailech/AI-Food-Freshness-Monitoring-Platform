"""Database operational endpoints."""

import re

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.config import get_database_url
from app.db.session import DatabaseNotConfiguredError, get_engine

router = APIRouter(prefix="/database", tags=["database"])


def _redact_database_error(error: SQLAlchemyError) -> str:
    """Return a useful connection error without exposing the configured URL."""
    message = str(error)
    database_url = get_database_url()
    if database_url:
        message = message.replace(database_url, "[redacted database URL]")
    message = re.sub(
        r"(postgresql(?:\+[a-z0-9_]+)?://[^:@\s]+:)[^@\s]*(@)",
        r"\1***\2",
        message,
        flags=re.IGNORECASE,
    )
    return re.sub(r"(?i)(password\s*=\s*)[^\s,;]+", r"\1***", message)


@router.get("/health")
def database_health() -> JSONResponse:
    """Check configured PostgreSQL connectivity without changing database state."""
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except DatabaseNotConfiguredError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_configured",
                "detail": "DATABASE_URL is not configured.",
            },
        )
    except SQLAlchemyError as error:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unavailable",
                "detail": "PostgreSQL connection could not be established.",
                "diagnostic": _redact_database_error(error),
            },
        )

    return JSONResponse(content={"status": "ok"})
