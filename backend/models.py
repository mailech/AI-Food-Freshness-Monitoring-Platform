from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class FoodItem(db.Model):
    __tablename__ = 'food_item'

    id = db.Column(db.Integer, primary_key=True)

    # User isolation: links food item to specific user
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False
    )

    # Basic food information
    food_name = db.Column(db.String(150), nullable=False)
    category = db.Column(
        db.String(100),
        nullable=False,
        default='General'
    )

    # Date and shelf-life information
    scanned_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    shelf_life_days = db.Column(
        db.Integer,
        nullable=False,
        default=5
    )

    # AI prediction
    ai_confidence = db.Column(
        db.Float,
        nullable=False,
        default=0.95
    )

    status = db.Column(
        db.String(50),
        nullable=False,
        default='Fresh'
    )

    # -----------------------------------
    # Multi-Factor Freshness Assessment
    # -----------------------------------

    # Visual condition score (0-100)
    visual_score = db.Column(
        db.Float,
        nullable=False,
        default=95.0
    )

    # Storage condition score (0-100)
    storage_score = db.Column(
        db.Float,
        nullable=False,
        default=100.0
    )

    # Remaining shelf-life score (0-100)
    shelf_life_score = db.Column(
        db.Float,
        nullable=False,
        default=100.0
    )

    # Product age score (0-100)
    age_score = db.Column(
        db.Float,
        nullable=False,
        default=100.0
    )

    # Final weighted freshness score (0-100)
    freshness_score = db.Column(
        db.Float,
        nullable=False,
        default=95.0
    )

    # Risk level
    risk_level = db.Column(
        db.String(50),
        nullable=False,
        default='Low'
    )

    # Final freshness category
    # Fresh / Good / Acceptable / Near Spoilage / Spoiled
    freshness_category = db.Column(
        db.String(50),
        nullable=False,
        default='Fresh'
    )

    # Record creation time
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'food_name': self.food_name,
            'category': self.category,
            'scanned_date': (
                self.scanned_date.isoformat()
                if self.scanned_date else None
            ),
            'expiry_date': (
                self.expiry_date.isoformat()
                if self.expiry_date else None
            ),
            'shelf_life_days': self.shelf_life_days,
            'ai_confidence': self.ai_confidence,
            'status': self.status,

            # Multi-factor freshness data
            'visual_score': self.visual_score,
            'storage_score': self.storage_score,
            'shelf_life_score': self.shelf_life_score,
            'age_score': self.age_score,
            'freshness_score': self.freshness_score,
            'risk_level': self.risk_level,
            'freshness_category': self.freshness_category,

            'created_at': (
                self.created_at.isoformat()
                if self.created_at else None
            )
        }