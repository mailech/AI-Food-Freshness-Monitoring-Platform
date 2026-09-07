from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class FoodItem(db.Model):
    __tablename__ = 'food_item'

    id = db.Column(db.Integer, primary_key=True)
    food_name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(100), nullable=False, default='General')
    scanned_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    shelf_life_days = db.Column(db.Integer, nullable=False, default=5)
    ai_confidence = db.Column(db.Float, nullable=False, default=0.95)
    status = db.Column(db.String(50), nullable=False, default='Fresh')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "food_name": self.food_name,
            "category": self.category,
            "scanned_date": self.scanned_date.strftime("%Y-%m-%d") if self.scanned_date else None,
            "expiry_date": self.expiry_date.strftime("%Y-%m-%d") if self.expiry_date else None,
            "shelf_life_days": self.shelf_life_days,
            "ai_confidence": round(self.ai_confidence, 4) if self.ai_confidence is not None else 0.0,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None
        }