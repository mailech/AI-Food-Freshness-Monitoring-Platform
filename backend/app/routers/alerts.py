"""Authenticated alert management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.alert import Alert
from app.models.enums import AlertCategory, UserRole
from app.models.user import User
from app.schemas.alerts import AlertCreate, AlertPriority, AlertResponse
from app.services.alerts import (generate_alert, get_alert, get_food_batch, list_alerts,
                                 mark_alert_dismissed, mark_alert_read, mark_all_alerts_read)

router = APIRouter(prefix="/alerts", tags=["alerts"])
AuthenticatedUser = Annotated[User, Depends(get_current_user)]
AlertCreator = Annotated[User, Depends(require_roles(
    UserRole.RETAIL_MANAGER, UserRole.WAREHOUSE_OPERATOR,
    UserRole.FOOD_QUALITY_INSPECTOR, UserRole.ADMINISTRATOR,
))]
DatabaseSession = Annotated[Session, Depends(get_db)]


def _get_accessible_alert(db: Session, alert_id: int, current_user: User, *,
                          allow_administrator: bool = False) -> Alert:
    """Fetch an alert without disclosing another user's data to normal users."""
    alert = get_alert(db, alert_id)
    if alert is None or (alert.user_id != current_user.id and not (
        allow_administrator and current_user.role == UserRole.ADMINISTRATOR
    )):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    return alert


@router.get("/health")
def alerts_health() -> dict[str, str]:
    """Return module readiness without exposing alert data."""
    return {"module": "alerts", "status": "ready"}


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(payload: AlertCreate, db: DatabaseSession, current_user: AlertCreator) -> Alert:
    """Persist explicit input; no automatic alert rules run here."""
    if get_food_batch(db, payload.food_batch_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food batch not found.")
    return generate_alert(db, user_id=current_user.id, payload=payload)


@router.get("/", response_model=list[AlertResponse])
def list_user_alerts(db: DatabaseSession, current_user: AuthenticatedUser,
                     category: AlertCategory | None = None, priority: AlertPriority | None = None,
                     is_read: bool | None = None, is_dismissed: bool | None = None,
                     food_batch_id: int | None = None) -> list[Alert]:
    """List the authenticated user's alerts, newest first."""
    return list_alerts(db, user_id=current_user.id, category=category, priority=priority,
                       is_read=is_read, is_dismissed=is_dismissed, food_batch_id=food_batch_id)


@router.patch("/read-all", response_model=list[AlertResponse])
def read_all_alerts(db: DatabaseSession, current_user: AuthenticatedUser) -> list[Alert]:
    """Mark every alert owned by the authenticated user as read."""
    return mark_all_alerts_read(db, user_id=current_user.id)


@router.get("/history", response_model=list[AlertResponse])
def alert_history(db: DatabaseSession, current_user: AuthenticatedUser) -> list[Alert]:
    """Return all the user's alerts, including read and dismissed items."""
    return list_alerts(db, user_id=current_user.id)


@router.get("/{alert_id}", response_model=AlertResponse)
def read_alert(alert_id: int, db: DatabaseSession, current_user: AuthenticatedUser) -> Alert:
    """Return an owned alert, or any alert for an administrator."""
    return _get_accessible_alert(db, alert_id, current_user, allow_administrator=True)


@router.patch("/{alert_id}/read", response_model=AlertResponse)
def read_alert_item(alert_id: int, db: DatabaseSession, current_user: AuthenticatedUser) -> Alert:
    """Mark one of the authenticated user's alerts as read."""
    return mark_alert_read(db, _get_accessible_alert(db, alert_id, current_user))


@router.patch("/{alert_id}/dismiss", response_model=AlertResponse)
def dismiss_alert(alert_id: int, db: DatabaseSession, current_user: AuthenticatedUser) -> Alert:
    """Dismiss one owned alert without deleting it."""
    return mark_alert_dismissed(db, _get_accessible_alert(db, alert_id, current_user))
