from typing import List, Dict, Any
from app.services.db import db

class RecommendationService:
    def get_all(self, category: str = None, rec_type: str = None) -> List[Dict[str, Any]]:
        recs = list(db.recommendations)
        if category and category != "All":
            recs = [r for r in recs if r.get("category", "").lower() == category.lower()]
        if rec_type and rec_type != "All":
            recs = [r for r in recs if r.get("type", "").lower() == rec_type.lower()]
        return recs

recommendation_service = RecommendationService()
