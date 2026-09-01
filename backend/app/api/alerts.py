from fastapi import APIRouter, Query
from typing import List, Optional
from app.models.schemas import Alert
from app.services.alert_service import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

@router.get("", response_model=List[Alert])
def get_alerts(
    alert_type: Optional[str] = Query(None),
    unread_only: bool = Query(False)
):
    return alert_service.get_all(alert_type=alert_type, unread_only=unread_only)

@router.put("/{alert_id}/read")
def mark_alert_read(alert_id: str):
    success = alert_service.mark_read(alert_id)
    return {"success": success}

@router.put("/read-all")
def mark_all_alerts_read():
    success = alert_service.mark_all_read()
    return {"success": success}
