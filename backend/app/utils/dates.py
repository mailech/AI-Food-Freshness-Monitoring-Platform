"""Date and datetime helpers.

PostgreSQL `TIMESTAMPTZ` round-trips as timezone-aware, but SQLite has no
timezone type and returns naive datetimes. Comparing the two raises
``TypeError: can't compare offset-naive and offset-aware datetimes``, so every
comparison between a stored timestamp and "now" goes through `ensure_utc`.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta


def ensure_utc(value: datetime | None) -> datetime | None:
    """Attach UTC to a naive datetime; leave aware datetimes untouched."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def utcnow() -> datetime:
    return datetime.now(UTC)


def days_between(start: date | None, end: date | None) -> int | None:
    if start is None or end is None:
        return None
    return (end - start).days


def days_until(target: date | None, *, reference: date | None = None) -> int | None:
    if target is None:
        return None
    return (target - (reference or date.today())).days


def age_in_days(reference: date | None, *, today: date | None = None) -> float | None:
    if reference is None:
        return None
    return max(0.0, float(((today or date.today()) - reference).days))


def is_older_than(value: datetime | None, *, days: float) -> bool:
    """True when `value` is more than `days` old (naive-safe)."""
    aware = ensure_utc(value)
    if aware is None:
        return False
    return aware < utcnow() - timedelta(days=days)


def iso(value: datetime | date | None) -> str | None:
    return value.isoformat() if value is not None else None
