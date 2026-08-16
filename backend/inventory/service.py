from sqlalchemy.orm import Session
from models import FoodItem, Batch, AnalysisRecord
from datetime import datetime, timedelta

def get_inventory_stats(db: Session, user_id: int = None):
    query = db.query(FoodItem)
    if user_id:
        query = query.filter(FoodItem.added_by == user_id)
    total = query.count()
    items = query.all()
    fresh = 0
    spoiled = 0
    expiring_soon = 0
    now = datetime.utcnow()
    threshold = now + timedelta(days=3)
    for item in items:
        latest = db.query(AnalysisRecord).filter(AnalysisRecord.food_item_id == item.id).order_by(AnalysisRecord.created_at.desc()).first()
        if latest:
            if latest.freshness_score >= 70:
                fresh += 1
            elif latest.freshness_score < 30:
                spoiled += 1
        batches = db.query(Batch).filter(Batch.food_item_id == item.id).all()
        for batch in batches:
            if batch.expiry_date and batch.expiry_date <= threshold:
                expiring_soon += 1
    return {"total_items": total, "fresh_items": fresh, "spoiled_items": spoiled, "expiring_soon": expiring_soon}

def get_expiring_items(db: Session, days: int = 7, user_id: int = None):
    threshold = datetime.utcnow() + timedelta(days=days)
    query = db.query(Batch).filter(Batch.expiry_date != None, Batch.expiry_date <= threshold)
    batches = query.all()
    result = []
    for batch in batches:
        item = db.query(FoodItem).filter(FoodItem.id == batch.food_item_id).first()
        if item and (user_id is None or item.added_by == user_id):
            result.append({"batch": batch, "food_item": item, "days_until_expiry": (batch.expiry_date - datetime.utcnow()).days})
    return result
