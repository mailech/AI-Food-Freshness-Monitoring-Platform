"""
Food Inventory Service Layer using SQLAlchemy ORM
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
from app.db.session import SessionLocal
from app.models.orm import FoodItemORM

class FoodService:
    def _to_dict(self, item: FoodItemORM) -> Dict[str, Any]:
        return {
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "batch_id": item.batch_id,
            "quantity": float(item.quantity),
            "unit": item.unit,
            "purchase_date": item.purchase_date,
            "expiry_date": item.expiry_date,
            "storage_temp": float(item.storage_temp),
            "humidity": float(item.humidity),
            "packaging_type": item.packaging_type,
            "image_url": item.image_url,
            "freshness_status": item.freshness_status,
            "freshness_score": int(item.freshness_score),
            "spoilage_probability": float(item.spoilage_probability),
            "estimated_shelf_life_days": int(item.estimated_shelf_life_days),
            "storage_duration_days": int(item.storage_duration_days),
            "confidence": float(item.confidence),
            "detected_issues": item.detected_issues or [],
            "recommendation": item.recommendation or "",
            "created_at": item.created_at,
            "freshness_history": item.freshness_history or []
        }

    def get_all(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "expiry_date"
    ) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            query = db.query(FoodItemORM)
            if category and category.lower() != "all":
                query = query.filter(FoodItemORM.category.ilike(f"%{category}%"))
            if status and status.lower() != "all":
                query = query.filter(FoodItemORM.freshness_status.ilike(f"%{status}%"))
            if search:
                s = f"%{search}%"
                query = query.filter(
                    (FoodItemORM.name.ilike(s)) | (FoodItemORM.batch_id.ilike(s))
                )

            items = query.all()
            result = [self._to_dict(i) for i in items]

            if sort_by == "expiry_date":
                result.sort(key=lambda x: x["expiry_date"])
            elif sort_by == "freshness_score":
                result.sort(key=lambda x: x["freshness_score"], reverse=True)
            elif sort_by == "name":
                result.sort(key=lambda x: x["name"])

            return result
        finally:
            db.close()

    def get_by_id(self, food_id: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            item = db.query(FoodItemORM).filter(FoodItemORM.id == food_id).first()
            return self._to_dict(item) if item else None
        finally:
            db.close()

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            new_id = data.get("id") or f"food-{uuid.uuid4().hex[:6]}"
            
            # Generate default 7-day history if not provided
            today = datetime.now()
            history = data.get("freshness_history")
            if not history:
                score = data.get("freshness_score", 90)
                history = [
                    {"date": (today - timedelta(days=6-d)).strftime("%Y-%m-%d"), "score": min(100, max(20, score + (6-d)))}
                    for d in range(7)
                ]

            food = FoodItemORM(
                id=new_id,
                name=data["name"],
                category=data["category"],
                batch_id=data.get("batch_id") or f"BATCH-{uuid.uuid4().hex[:5].upper()}",
                quantity=float(data.get("quantity", 1.0)),
                unit=data.get("unit", "kg"),
                purchase_date=data.get("purchase_date") or today.strftime("%Y-%m-%d"),
                expiry_date=data.get("expiry_date") or (today + timedelta(days=7)).strftime("%Y-%m-%d"),
                storage_temp=float(data.get("storage_temp", 4.0)),
                humidity=float(data.get("humidity", 85.0)),
                packaging_type=data.get("packaging_type", "Standard Packaging"),
                image_url=data.get("image_url"),
                freshness_status=data.get("freshness_status", "Fresh"),
                freshness_score=int(data.get("freshness_score", 90)),
                spoilage_probability=float(data.get("spoilage_probability", 0.05)),
                estimated_shelf_life_days=int(data.get("estimated_shelf_life_days", 7)),
                storage_duration_days=int(data.get("storage_duration_days", 1)),
                confidence=float(data.get("confidence", 0.92)),
                detected_issues=data.get("detected_issues", ["None"]),
                recommendation=data.get("recommendation", "Store in optimal refrigeration."),
                created_at=today.isoformat(),
                freshness_history=history
            )
            db.add(food)
            db.commit()
            db.refresh(food)
            return self._to_dict(food)
        finally:
            db.close()

    def update(self, food_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            food = db.query(FoodItemORM).filter(FoodItemORM.id == food_id).first()
            if not food:
                return None
            for key, val in data.items():
                if hasattr(food, key) and val is not None:
                    setattr(food, key, val)
            db.commit()
            db.refresh(food)
            return self._to_dict(food)
        finally:
            db.close()

    def delete(self, food_id: str) -> bool:
        db = SessionLocal()
        try:
            food = db.query(FoodItemORM).filter(FoodItemORM.id == food_id).first()
            if not food:
                return False
            db.delete(food)
            db.commit()
            return True
        finally:
            db.close()

food_service = FoodService()
