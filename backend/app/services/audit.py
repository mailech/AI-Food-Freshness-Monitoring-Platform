"""Audit logging service.

Writes an append-only trail of security- and data-relevant operations. Payloads
are scrubbed of credential-like keys before persistence.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.enums import AuditAction
from app.core.logging_config import get_logger
from app.models import AuditLog, User

logger = get_logger("app.audit")

_REDACT_KEYS = {
    "password",
    "new_password",
    "current_password",
    "hashed_password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "secret",
    "jwt_secret_key",
    "api_key",
}


def scrub(data: Any) -> Any:
    """Recursively remove credential-like values from a payload."""
    if isinstance(data, dict):
        return {
            key: ("***redacted***" if str(key).lower() in _REDACT_KEYS else scrub(value))
            for key, value in data.items()
        }
    if isinstance(data, (list, tuple)):
        return [scrub(item) for item in data]
    return data


def record_audit(
    db: Session,
    *,
    action: AuditAction | str,
    user: User | None = None,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    description: str | None = None,
    success: bool = True,
    metadata: dict[str, Any] | None = None,
    request_meta: dict[str, Any] | None = None,
) -> AuditLog:
    """Append an audit entry. The caller owns the transaction (no commit here)."""
    meta = request_meta or {}
    entry = AuditLog(
        user_id=user.id if user else None,
        actor_email=user.email if user else meta.get("actor_email"),
        actor_role=user.role_name if user else None,
        action=str(action.value if isinstance(action, AuditAction) else action),
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        description=description,
        method=meta.get("method"),
        path=meta.get("path"),
        status_code=meta.get("status_code"),
        ip_address=meta.get("ip_address"),
        user_agent=(meta.get("user_agent") or None),
        request_id=meta.get("request_id"),
        duration_ms=meta.get("duration_ms"),
        success=success,
        metadata_json=scrub(metadata) if metadata else None,
    )
    db.add(entry)
    logger.info(
        "audit action=%s entity=%s:%s user=%s success=%s",
        entry.action,
        entity_type,
        entry.entity_id,
        entry.user_id,
        success,
        extra={"event": "audit"},
    )
    return entry


def list_audit_logs(
    db: Session,
    *,
    user_id: int | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[AuditLog], int]:
    from sqlalchemy import func

    stmt = select(AuditLog)
    count_stmt = select(func.count(AuditLog.id))
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
        count_stmt = count_stmt.where(AuditLog.user_id == user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action.upper())
        count_stmt = count_stmt.where(AuditLog.action == action.upper())
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
        count_stmt = count_stmt.where(AuditLog.entity_type == entity_type)

    total = db.scalar(count_stmt) or 0
    rows = db.scalars(
        stmt.order_by(desc(AuditLog.created_at), desc(AuditLog.id)).limit(limit).offset(offset)
    ).all()
    return list(rows), total
