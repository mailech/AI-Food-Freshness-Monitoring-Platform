from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, FoodItem, AnalysisRecord, StorageCondition, Notification, Batch
from auth.dependencies import get_current_user, require_role
from notifications.service import get_unread_count
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/consumer")
def consumer_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(FoodItem).filter(FoodItem.added_by == user.id).count()
    analyses = db.query(AnalysisRecord).filter(AnalysisRecord.user_id == user.id).all()
    avg_freshness = sum(a.freshness_score for a in analyses) / len(analyses) if analyses else 0

    recent = db.query(AnalysisRecord).filter(AnalysisRecord.user_id == user.id).order_by(AnalysisRecord.created_at.desc()).limit(10).all()

    fresh_count = sum(1 for a in analyses if a.freshness_score >= 70)
    spoiled_count = sum(1 for a in analyses if a.freshness_score < 30)

    freshness_trend = [{"date": a.created_at.strftime("%Y-%m-%d"), "score": a.freshness_score, "food": a.food_name} for a in recent]

    category_dist = {}
    for a in analyses:
        cat = a.food_category or "Unknown"
        category_dist[cat] = category_dist.get(cat, 0) + 1

    return {
        "total_items": items,
        "total_analyses": len(analyses),
        "avg_freshness": round(avg_freshness, 1),
        "fresh_items": fresh_count,
        "spoiled_items": spoiled_count,
        "unread_notifications": get_unread_count(db, user.id),
        "freshness_trend": freshness_trend,
        "category_distribution": category_dist,
        "recent_analyses": [{"id": a.id, "food_name": a.food_name, "freshness_score": a.freshness_score, "quality_class": a.quality_class, "risk_level": a.risk_level, "date": str(a.created_at)} for a in recent]
    }

@router.get("/retail")
def retail_dashboard(user: User = Depends(require_role("RetailManager", "Administrator")), db: Session = Depends(get_db)):
    total_items = db.query(FoodItem).count()
    analyses = db.query(AnalysisRecord).all()
    avg_freshness = sum(a.freshness_score for a in analyses) / len(analyses) if analyses else 0

    quality_dist = {"Fresh": 0, "Good": 0, "Acceptable": 0, "Near Spoilage": 0, "Spoiled": 0}
    for a in analyses:
        if a.quality_class in quality_dist:
            quality_dist[a.quality_class] += 1

    now = datetime.utcnow()
    expiring = db.query(Batch).filter(Batch.expiry_date != None, Batch.expiry_date <= now + timedelta(days=3)).count()

    daily_analyses = db.query(func.date(AnalysisRecord.created_at), func.count(AnalysisRecord.id), func.avg(AnalysisRecord.freshness_score)).group_by(func.date(AnalysisRecord.created_at)).order_by(func.date(AnalysisRecord.created_at).desc()).limit(14).all()

    return {
        "total_items": total_items,
        "total_analyses": len(analyses),
        "avg_freshness": round(avg_freshness, 1),
        "quality_distribution": quality_dist,
        "expiring_soon": expiring,
        "daily_analytics": [{"date": str(d[0]), "count": d[1], "avg_score": round(d[2] or 0, 1)} for d in daily_analyses]
    }

@router.get("/warehouse")
def warehouse_dashboard(user: User = Depends(require_role("WarehouseOperator", "Administrator")), db: Session = Depends(get_db)):
    total_items = db.query(FoodItem).count()
    conditions = db.query(StorageCondition).all()
    compliant = sum(1 for c in conditions if c.is_compliant)
    compliance_rate = (compliant / len(conditions) * 100) if conditions else 100

    avg_temp = sum(c.temperature for c in conditions) / len(conditions) if conditions else 0
    avg_humidity = sum(c.humidity for c in conditions) / len(conditions) if conditions else 0

    batches = db.query(Batch).count()
    now = datetime.utcnow()
    expired_batches = db.query(Batch).filter(Batch.expiry_date != None, Batch.expiry_date < now).count()

    return {
        "total_items": total_items,
        "total_batches": batches,
        "expired_batches": expired_batches,
        "storage_compliance_rate": round(compliance_rate, 1),
        "avg_temperature": round(avg_temp, 1),
        "avg_humidity": round(avg_humidity, 1),
        "total_conditions_logged": len(conditions),
        "compliant_records": compliant
    }

@router.get("/admin")
def admin_dashboard(user: User = Depends(require_role("Administrator")), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_items = db.query(FoodItem).count()
    total_analyses = db.query(AnalysisRecord).count()
    total_notifications = db.query(Notification).count()

    role_dist = {}
    users = db.query(User).all()
    for u in users:
        role_dist[u.role] = role_dist.get(u.role, 0) + 1

    recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()

    analyses = db.query(AnalysisRecord).all()
    avg_freshness = sum(a.freshness_score for a in analyses) / len(analyses) if analyses else 0

    return {
        "total_users": total_users,
        "total_items": total_items,
        "total_analyses": total_analyses,
        "total_notifications": total_notifications,
        "avg_freshness": round(avg_freshness, 1),
        "role_distribution": role_dist,
        "recent_users": [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "date": str(u.created_at)} for u in recent_users]
    }
