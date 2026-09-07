"""
Recommendation Service Layer using SQLAlchemy ORM
"""
from typing import List, Dict, Any, Optional
from app.db.session import SessionLocal
from app.models.orm import RecommendationORM

class RecommendationService:
    def _to_dict(self, r: RecommendationORM) -> Dict[str, Any]:
        return {
            "id": r.id,
            "food_name": r.food_name,
            "category": r.category,
            "type": r.type,
            "title": r.title,
            "description": r.description,
            "priority": r.priority,
            "action_text": r.action_text
        }

    def get_all(self, category: Optional[str] = None, rec_type: Optional[str] = None) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            query = db.query(RecommendationORM)
            if category and category.lower() != "all":
                query = query.filter(RecommendationORM.category.ilike(f"%{category}%"))
            if rec_type and rec_type.lower() != "all":
                query = query.filter(RecommendationORM.type.ilike(f"%{rec_type}%"))
            recs = query.order_by(RecommendationORM.created_at.desc()).all()
            return [self._to_dict(r) for r in recs]
        finally:
            db.close()

recommendation_service = RecommendationService()
