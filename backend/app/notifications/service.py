"""In-app notification service.

Email delivery is *architecture only*: `EMAIL_ENABLED=false` by default, in which
case `send_email` logs the intent and returns False. Nothing in the platform
depends on an SMTP server being reachable.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Iterable

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.core.enums import AlertSeverity, NotificationType
from app.core.errors import NotFoundError
from app.core.logging_config import get_logger
from app.models import Alert, Notification, User

logger = get_logger("app.notifications")


# ---------------------------------------------------------------- creation
def create_notification(
    db: Session,
    *,
    user: User,
    notification_type: NotificationType | str,
    title: str,
    message: str,
    severity: AlertSeverity | str = AlertSeverity.INFO,
    alert: Alert | None = None,
    link: str | None = None,
    payload: dict[str, Any] | None = None,
) -> Notification:
    notification = Notification(
        user_id=user.id,
        alert_id=alert.id if alert else None,
        notification_type=str(
            notification_type.value
            if isinstance(notification_type, NotificationType)
            else notification_type
        ),
        title=title,
        message=message,
        severity=str(severity.value if isinstance(severity, AlertSeverity) else severity),
        link=link,
        payload=payload,
    )
    db.add(notification)
    db.flush()

    # Respect the user's channel preferences.
    if settings.EMAIL_ENABLED and user.profile and user.profile.notify_email:
        notification.email_sent = send_email(user.email, title, message)
        db.flush()
    return notification


def notify_users(
    db: Session,
    *,
    users: Iterable[User],
    notification_type: NotificationType | str,
    title: str,
    message: str,
    severity: AlertSeverity | str = AlertSeverity.INFO,
    alert: Alert | None = None,
    link: str | None = None,
    payload: dict[str, Any] | None = None,
) -> list[Notification]:
    created: list[Notification] = []
    for user in users:
        if user.profile is not None and not user.profile.notify_in_app:
            continue
        created.append(
            create_notification(
                db,
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                severity=severity,
                alert=alert,
                link=link,
                payload=payload,
            )
        )
    return created


def broadcast_system_notification(
    db: Session, *, title: str, message: str, severity: AlertSeverity | str = AlertSeverity.INFO,
    role_names: list[str] | None = None,
) -> int:
    """Platform-wide announcement, optionally limited to certain roles."""
    from app.models import Role

    stmt = select(User).where(User.is_active.is_(True))
    if role_names:
        role_ids = list(db.scalars(select(Role.id).where(Role.name.in_(role_names))).all())
        stmt = stmt.where(User.role_id.in_(role_ids or [-1]))
    users = list(db.scalars(stmt).unique().all())
    created = notify_users(
        db,
        users=users,
        notification_type=NotificationType.SYSTEM_NOTIFICATION,
        title=title,
        message=message,
        severity=severity,
        link="/notifications",
    )
    return len(created)


# ----------------------------------------------------------------- reading
def list_notifications(
    db: Session,
    user: User,
    *,
    unread_only: bool = False,
    notification_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Notification], int, int]:
    stmt = select(Notification).where(Notification.user_id == user.id)
    count_stmt = select(func.count(Notification.id)).where(Notification.user_id == user.id)

    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
        count_stmt = count_stmt.where(Notification.is_read.is_(False))
    if notification_type:
        stmt = stmt.where(Notification.notification_type == notification_type)
        count_stmt = count_stmt.where(Notification.notification_type == notification_type)

    total = int(db.scalar(count_stmt) or 0)
    rows = list(
        db.scalars(
            stmt.order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(page_size)
            .offset(max(0, (page - 1) * page_size))
        ).all()
    )
    unread = unread_count(db, user)
    return rows, total, unread


def unread_count(db: Session, user: User) -> int:
    return int(
        db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user.id, Notification.is_read.is_(False)
            )
        )
        or 0
    )


def mark_read(db: Session, user: User, notification_id: int) -> Notification:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    if notification is None:
        raise NotFoundError("Notification not found.", code="NOTIFICATION_NOT_FOUND")
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(UTC)
        db.flush()
    return notification


def mark_all_read(db: Session, user: User) -> int:
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.now(UTC))
    )
    db.flush()
    return int(result.rowcount or 0)


def delete_notification(db: Session, user: User, notification_id: int) -> None:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        )
    )
    if notification is None:
        raise NotFoundError("Notification not found.", code="NOTIFICATION_NOT_FOUND")
    db.delete(notification)
    db.flush()


# -------------------------------------------------------------------- email
def send_email(to_address: str, subject: str, body: str) -> bool:
    """Optional SMTP delivery.

    Returns False (and logs) when email is disabled or misconfigured - callers
    treat email as best-effort so a broken SMTP server never breaks a request.
    """
    if not settings.EMAIL_ENABLED:
        logger.debug("email disabled; would have sent '%s' to %s", subject, to_address)
        return False
    if not settings.SMTP_HOST:
        logger.warning("EMAIL_ENABLED=true but SMTP_HOST is not configured")
        return False

    import smtplib
    from email.message import EmailMessage

    try:
        message = EmailMessage()
        message["From"] = settings.EMAIL_FROM
        message["To"] = to_address
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
        logger.info("email sent to %s subject=%s", to_address, subject)
        return True
    except Exception as exc:  # noqa: BLE001 - email must never break a request
        logger.warning("email delivery failed for %s: %s", to_address, exc)
        return False
