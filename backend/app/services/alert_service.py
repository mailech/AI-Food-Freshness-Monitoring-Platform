from typing import List, Dict, Any, Optional
from app.services.db import db
import uuid

class AlertService:
    def get_all(self, alert_type: Optional[str] = None, unread_only: bool = False) -> List[Dict[str, Any]]:
        alerts = list(db.alerts)
        if alert_type and alert_type != "All":
            alerts = [a for a in alerts if a["type"].lower() == alert_type.lower()]
        if unread_only:
            alerts = [a for a in alerts if not a["is_read"]]
        return alerts

    def mark_read(self, alert_id: str) -> bool:
        for alert in db.alerts:
            if alert["id"] == alert_id:
                alert["is_read"] = True
                return True
        return False

    def mark_all_read(self) -> bool:
        for alert in db.alerts:
            alert["is_read"] = True
        return True

    def create_alert(self, title: str, message: str, alert_type: str, severity: str = "warning", related_item_id: str = None) -> Dict[str, Any]:
        new_alert = {
            "id": f"alt-{uuid.uuid4().hex[:6]}",
            "title": title,
            "message": message,
            "type": alert_type,
            "severity": severity,
            "timestamp": "Just now",
            "is_read": False,
            "related_item_id": related_item_id
        }
        db.alerts.insert(0, new_alert)
        return new_alert

alert_service = AlertService()
