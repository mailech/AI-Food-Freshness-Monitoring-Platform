from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.models.notifications import Notification
from app.routers.auth import get_current_user
from app.schemas.notifications import NotificationOut, SyncResult
from app.services.notifications import sync_user_notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/sync", response_model=SyncResult)
def sync_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Refresh auto-generated alerts from current inventory state (idempotent)."""
    return SyncResult(**sync_user_notifications(db, user))


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    type_filter: str | None = Query(None, alias="type"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    if type_filter:
        query = query.filter(Notification.type == type_filter)
    return (
        query.order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .all()
    )


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read.is_(False)
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
