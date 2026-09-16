"""Authenticated dashboard summary endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard import build_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
AuthenticatedUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("/health")
def dashboard_health() -> dict[str, str]:
    """Return module readiness without exposing dashboard data."""
    return {"module": "dashboard", "status": "ready"}


@router.get("/summary", response_model=DashboardSummary)
def read_dashboard_summary(db: DatabaseSession, current_user: AuthenticatedUser) -> DashboardSummary:
    """Return live inventory analytics for the authenticated user."""
    return build_dashboard_summary(db, user_id=current_user.id)
