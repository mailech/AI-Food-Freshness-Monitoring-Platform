"""Notification sync shared by the API endpoint and the background scheduler."""

from sqlalchemy.orm import Session

from app.ml.alerts import AUTO_TYPES, generate_alerts, send_email
from app.models.inventory import FoodItem
from app.models.notifications import Notification
from app.models.user import User
from app.services.scoring import gather_item_state

EMAIL_SEVERITIES = {"critical", "warning"}


def sync_user_notifications(db: Session, user: User) -> dict:
    """Regenerate auto alerts for one user; returns (created, emailed, active)."""
    items = db.query(FoodItem).filter(FoodItem.owner_id == user.id).all()
    states = [gather_item_state(db, item) for item in items]
    alerts = generate_alerts(states)

    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read.is_(False),
        Notification.type.in_(AUTO_TYPES),
    ).delete(synchronize_session=False)

    emailed_any = False
    for alert in alerts:
        notification = Notification(user_id=user.id, **alert)
        if alert["severity"] in EMAIL_SEVERITIES:
            notification.emailed = send_email(
                user.email,
                f"[{alert['severity'].upper()}] {alert['title']}",
                alert["message"],
            )
            emailed_any = emailed_any or notification.emailed
        db.add(notification)
    db.commit()

    active = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .count()
    )
    return {"created": len(alerts), "emailed": emailed_any, "active_alerts": active}
