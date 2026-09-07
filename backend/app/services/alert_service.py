"""
Alert Service Layer using SQLAlchemy ORM
"""
from typing import List, Dict, Any, Optional
from app.db.session import SessionLocal
from app.models.orm import AlertORM

class AlertService:
    def _to_dict(self, a: AlertORM) -> Dict[str, Any]:
        return {
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "type": a.type,
            "severity": a.severity,
            "timestamp": a.timestamp,
            "is_read": bool(a.is_read),
            "related_item_id": a.related_item_id
        }

    def get_all(self, alert_type: Optional[str] = None, unread_only: bool = False) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            query = db.query(AlertORM)
            if alert_type and alert_type.lower() != "all":
                query = query.filter(AlertORM.type.ilike(f"%{alert_type}%"))
            if unread_only:
                query = query.filter(AlertORM.is_read == False)
            alerts = query.order_by(AlertORM.created_at.desc()).all()
            return [self._to_dict(a) for a in alerts]
        finally:
            db.close()

    def mark_as_read(self, alert_id: str) -> bool:
        db = SessionLocal()
        try:
            alert = db.query(AlertORM).filter(AlertORM.id == alert_id).first()
            if alert:
                alert.is_read = True
                db.commit()
                return True
            return False
        finally:
            db.close()

    def mark_all_as_read(self) -> bool:
        db = SessionLocal()
        try:
            db.query(AlertORM).update({"is_read": True})
            db.commit()
            return True
        finally:
            db.close()

alert_service = AlertService()
