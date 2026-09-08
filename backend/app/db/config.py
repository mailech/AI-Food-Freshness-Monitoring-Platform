"""PostgreSQL configuration helpers."""

from app.core.config import settings


def get_database_url() -> str | None:
    """Return the configured DATABASE_URL without connecting to PostgreSQL."""
    return settings.database_url
