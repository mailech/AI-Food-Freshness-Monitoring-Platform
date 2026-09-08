"""Lazy SQLAlchemy engine and session management."""

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.config import get_database_url


class DatabaseNotConfiguredError(RuntimeError):
    """Raised when a database operation is requested without DATABASE_URL."""


_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """Create the SQLAlchemy engine only when database access is requested.

    Creating an engine does not open a PostgreSQL connection. A connection is
    opened only when a caller requests one from the engine or a session.
    """
    global _engine

    if _engine is None:
        database_url = get_database_url()
        if not database_url:
            raise DatabaseNotConfiguredError(
                "DATABASE_URL is not configured. Add it to a local backend/.env file."
            )
        _engine = create_engine(
            database_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the lazily initialized session factory."""
    global _session_factory

    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(),
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    """Provide one SQLAlchemy session per request and close it afterwards."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
