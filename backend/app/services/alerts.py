"""Persistence operations for explicitly generated alerts.

No threshold or food-condition rules live here. Future freshness, shelf-life,
storage, and inventory workflows can call ``generate_alert`` when rules exist.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.food_batch import FoodBatch
from app.schemas.alerts import AlertCreate, AlertPriority


def get_food_batch(db: Session, food_batch_id: int) -> FoodBatch | None:
    return db.get(FoodBatch, food_batch_id)


def get_alert(db: Session, alert_id: int) -> Alert | None:
    return db.get(Alert, alert_id)


def list_alerts(db: Session, *, user_id: int, category=None,
                priority: AlertPriority | None = None, is_read: bool | None = None,
                is_dismissed: bool | None = None,
                food_batch_id: int | None = None) -> list[Alert]:
    """Return a user's alerts newest first, with optional filters."""
    statement = select(Alert).where(Alert.user_id == user_id).order_by(
        Alert.created_at.desc(), Alert.id.desc()
    )
    for column, value in ((Alert.category, category), (Alert.priority, priority),
                          (Alert.is_read, is_read), (Alert.is_dismissed, is_dismissed),
                          (Alert.food_batch_id, food_batch_id)):
        if value is not None:
            statement = statement.where(column == getattr(value, "value", value))
    return list(db.scalars(statement))


def generate_alert(db: Session, *, user_id: int, payload: AlertCreate) -> Alert:
    """Persist supplied information without inferring any food condition."""
    alert = Alert(user_id=user_id, food_batch_id=payload.food_batch_id,
                  category=payload.category, priority=payload.priority.value,
                  title=payload.title, message=payload.message)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def mark_alert_read(db: Session, alert: Alert) -> Alert:
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


def mark_alert_dismissed(db: Session, alert: Alert) -> Alert:
    alert.is_dismissed = True
    db.commit()
    db.refresh(alert)
    return alert


def mark_all_alerts_read(db: Session, *, user_id: int) -> list[Alert]:
    alerts = list_alerts(db, user_id=user_id)
    for alert in alerts:
        alert.is_read = True
    if alerts:
        db.commit()
        for alert in alerts:
            db.refresh(alert)
    return alerts
