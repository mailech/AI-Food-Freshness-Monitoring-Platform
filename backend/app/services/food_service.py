from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, date, timedelta
from app.services.db import db
from app.services.ai_service import ai_service

class FoodService:
    def get_all(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "expiry_date"
    ) -> List[Dict[str, Any]]:
        items = list(db.foods)

        if category and category != "All":
            items = [i for i in items if i["category"].lower() == category.lower()]

        if status and status != "All":
            items = [i for i in items if i["freshness_status"].lower() == status.lower()]

        if search:
            query = search.lower().strip()
            items = [i for i in items if query in i["name"].lower() or query in i["batch_id"].lower() or query in i["category"].lower()]

        if sort_by == "expiry_date":
            items.sort(key=lambda x: x["expiry_date"])
        elif sort_by == "freshness_score":
            items.sort(key=lambda x: x["freshness_score"], reverse=True)
        elif sort_by == "name":
            items.sort(key=lambda x: x["name"])

        return items

    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        for item in db.foods:
            if item["id"] == item_id:
                return item
        return None

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        item_id = f"food-{len(db.foods)+1:03d}"
        today = datetime.now()
        
        # Calculate freshness and shelf life using AI service
        ai_res = ai_service.analyze_food(food_type=data.get("name", "Food Item"), category=data.get("category", "Produce"))
        
        # Parse purchase date and expiry
        p_date = data.get("purchase_date", today.strftime("%Y-%m-%d"))
        e_date = data.get("expiry_date", (today + timedelta(days=ai_res["estimated_shelf_life_days"])).strftime("%Y-%m-%d"))

        # Build 7-day initial history
        history = []
        for d in range(6, -1, -1):
            h_date = (today - timedelta(days=d)).strftime("%Y-%m-%d")
            h_score = min(100, max(10, ai_res["freshness_score"] + (d * 1)))
            history.append({"date": h_date, "score": h_score})

        new_item = {
            "id": item_id,
            "name": data["name"],
            "category": data["category"],
            "batch_id": data.get("batch_id") or f"BATCH-{uuid.uuid4().hex[:6].upper()}",
            "quantity": float(data.get("quantity", 1.0)),
            "unit": data.get("unit", "units"),
            "purchase_date": p_date,
            "expiry_date": e_date,
            "storage_temp": float(data.get("storage_temp", 4.0)),
            "humidity": float(data.get("humidity", 80.0)),
            "packaging_type": data.get("packaging_type", "Standard Container"),
            "image_url": data.get("image_url") or "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
            "freshness_status": data.get("freshness_status") or ai_res["freshness_category"],
            "freshness_score": int(data.get("freshness_score") or ai_res["freshness_score"]),
            "spoilage_probability": ai_res["spoilage_probability"],
            "estimated_shelf_life_days": ai_res["estimated_shelf_life_days"],
            "storage_duration_days": 1,
            "confidence": ai_res["confidence"],
            "detected_issues": ai_res["detected_issues"],
            "recommendation": ai_res["recommendation"],
            "created_at": today.isoformat(),
            "freshness_history": history
        }

        db.foods.insert(0, new_item)

        # Trigger alert if near spoilage or short shelf life
        if new_item["freshness_status"] in ["Near Spoilage", "Spoiled"] or new_item["estimated_shelf_life_days"] <= 2:
            alert = {
                "id": f"alt-{uuid.uuid4().hex[:6]}",
                "title": f"New Critical Inventory Item: {new_item['name']}",
                "message": f"Batch {new_item['batch_id']} requires immediate attention (Status: {new_item['freshness_status']}, Shelf-life: {new_item['estimated_shelf_life_days']}d).",
                "type": "Shelf-Life Warning" if new_item["freshness_status"] != "Spoiled" else "Spoilage Alert",
                "severity": "critical" if new_item["freshness_status"] == "Spoiled" else "warning",
                "timestamp": "Just now",
                "is_read": False,
                "related_item_id": item_id
            }
            db.alerts.insert(0, alert)

        # Add to recent analysis
        db.recent_analyses.insert(0, {
            "id": f"ana-{uuid.uuid4().hex[:6]}",
            "food_name": new_item["name"],
            "timestamp": "Just now",
            "score": new_item["freshness_score"],
            "status": new_item["freshness_status"],
            "confidence": new_item["confidence"],
            "image_url": new_item["image_url"]
        })

        return new_item

    def update(self, item_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for i, item in enumerate(db.foods):
            if item["id"] == item_id:
                for k, v in data.items():
                    if v is not None:
                        item[k] = v
                db.foods[i] = item
                return item
        return None

    def delete(self, item_id: str) -> bool:
        for i, item in enumerate(db.foods):
            if item["id"] == item_id:
                db.foods.pop(i)
                return True
        return False

food_service = FoodService()
