from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models.entities import Alert, User
from app.schemas.all_schemas import AlertOut
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

@router.get("/", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    unread_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if unread_only:
        query = query.filter(Alert.is_read == False)
    return query.order_by(Alert.is_read.asc(), Alert.created_at.desc()).all()

@router.get("/summary")
def get_alerts_summary(db: Session = Depends(get_db)):
    total = db.query(Alert).filter(Alert.is_resolved == False).count()
    critical = db.query(Alert).filter(Alert.severity == "critical", Alert.is_resolved == False).count()
    high = db.query(Alert).filter(Alert.severity == "high", Alert.is_resolved == False).count()
    medium = db.query(Alert).filter(Alert.severity == "medium", Alert.is_resolved == False).count()
    low = db.query(Alert).filter(Alert.severity == "low", Alert.is_resolved == False).count()
    unread = db.query(Alert).filter(Alert.is_read == False).count()
    
    return {
        "total_active": total,
        "unread_count": unread,
        "critical_count": critical,
        "high_count": high,
        "medium_count": medium,
        "low_count": low
    }

@router.put("/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"status": "success", "message": "Alert marked as read"}

@router.put("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.is_read = True
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.full_name
    db.commit()
    return {"status": "success", "message": f"Alert resolved by {current_user.full_name}"}

@router.post("/mark-all-read")
def mark_all_alerts_read(db: Session = Depends(get_db)):
    db.query(Alert).filter(Alert.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success", "message": "All alerts marked as read"}
