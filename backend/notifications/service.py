from sqlalchemy.orm import Session
from models import Notification, AnalysisRecord, FoodItem, Batch
from datetime import datetime, timedelta

def create_notification(db: Session, user_id: int, ntype: str, title: str, message: str, priority: str = "normal", related_item_id: int = None):
    notif = Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        priority=priority,
        related_item_id=related_item_id
    )
    db.add(notif)
    db.commit()
    return notif

def check_and_generate_alerts(db: Session, user_id: int):
    alerts = []

    recent_analyses = db.query(AnalysisRecord).filter(
        AnalysisRecord.user_id == user_id,
        AnalysisRecord.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).all()

    for analysis in recent_analyses:
        if analysis.freshness_score < 30:
            existing = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.related_item_id == analysis.id,
                Notification.type == "spoilage_alert"
            ).first()
            if not existing:
                n = create_notification(db, user_id, "spoilage_alert",
                    f"Spoilage Alert: {analysis.food_name}",
                    f"{analysis.food_name} has a freshness score of {analysis.freshness_score}%. Immediate action required.",
                    "high", analysis.id)
                alerts.append(n)
        elif analysis.freshness_score < 50:
            existing = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.related_item_id == analysis.id,
                Notification.type == "freshness_alert"
            ).first()
            if not existing:
                n = create_notification(db, user_id, "freshness_alert",
                    f"Freshness Warning: {analysis.food_name}",
                    f"{analysis.food_name} quality is declining (score: {analysis.freshness_score}%). Consider using soon.",
                    "medium", analysis.id)
                alerts.append(n)

        if analysis.shelf_life_days <= 1:
            existing = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.related_item_id == analysis.id,
                Notification.type == "shelf_life_warning"
            ).first()
            if not existing:
                n = create_notification(db, user_id, "shelf_life_warning",
                    f"Shelf Life Critical: {analysis.food_name}",
                    f"{analysis.food_name} has less than 1 day of shelf life remaining.",
                    "high", analysis.id)
                alerts.append(n)

    return alerts

def get_unread_count(db: Session, user_id: int):
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()
