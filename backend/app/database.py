"""SQLAlchemy engine / session management.

PostgreSQL is the primary target. A SQLite fallback keeps the project runnable
with zero infrastructure (useful for tests and quick local demos) - the ORM
layer keeps both dialects working without code changes.
"""

from __future__ import annotations

from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings


def _engine_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {"echo": settings.DB_ECHO, "future": True, "pool_pre_ping": True}
    if settings.is_sqlite:
        # check_same_thread=False is required because FastAPI serves requests
        # from a thread pool.
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = settings.DB_POOL_SIZE
        kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
    return kwargs


engine: Engine = create_engine(settings.DATABASE_URL, **_engine_kwargs())

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


@event.listens_for(Engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):  # pragma: no cover - driver hook
    """Enable foreign-key enforcement on SQLite (off by default)."""
    if settings.is_sqlite:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database() -> tuple[bool, str]:
    """Lightweight connectivity probe used by /health."""
    from sqlalchemy import text

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "connected"
    except Exception as exc:  # noqa: BLE001 - health check must not raise
        return False, f"unavailable: {type(exc).__name__}"
