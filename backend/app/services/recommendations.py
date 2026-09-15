from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.food_batch import FoodBatch
from app.models.recommendation import Recommendation
from app.schemas.recommendations import (
    RecommendationCreate,
    RecommendationPriority,
    RecommendationSource,
    RecommendationStatus,
)


def get_batch(db: Session, i: int) -> FoodBatch | None:
    return db.get(FoodBatch, i)


def get_recommendation(db: Session, i: int) -> Recommendation | None:
    return db.get(Recommendation, i)


def list_recommendations(db: Session, batch_id=None, recommendation_type=None, priority=None, status=None):
    s = select(Recommendation).order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
    for col, val in [
        (Recommendation.food_batch_id, batch_id),
        (Recommendation.recommendation_type, recommendation_type),
        (Recommendation.priority, priority),
        (Recommendation.status, status),
    ]:
        if val is not None:
            s = s.where(col == getattr(val, "value", val))
    return list(db.scalars(s))


def generate_recommendation(db: Session, p: RecommendationCreate) -> Recommendation:
    """Persist a user-authored recommendation without inferring food conditions."""
    r = Recommendation(**p.model_dump(mode="json"))
    r.status = p.status.value
    r.source = RecommendationSource.MANUAL.value
    r.condition_key = None
    r.completed_at = datetime.now(UTC) if p.status is RecommendationStatus.COMPLETED else None
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def find_active_automatic_recommendation(
    db: Session, *, food_batch_id: int, condition_key: str
) -> Recommendation | None:
    """Return the newest incomplete automatic recommendation for a condition."""
    statement = (
        select(Recommendation)
        .where(
            Recommendation.food_batch_id == food_batch_id,
            Recommendation.source == RecommendationSource.AUTOMATIC.value,
            Recommendation.condition_key == condition_key,
            Recommendation.status != RecommendationStatus.COMPLETED.value,
        )
        .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
        .limit(1)
    )
    return db.scalar(statement)


def persist_automatic_recommendation(
    db: Session,
    *,
    food_batch_id: int,
    recommendation_type,
    priority: RecommendationPriority,
    message: str,
    condition_key: str,
) -> Recommendation:
    """Create an automatic recommendation only when no active equivalent exists."""
    existing = find_active_automatic_recommendation(
        db, food_batch_id=food_batch_id, condition_key=condition_key
    )
    if existing is not None:
        return existing
    recommendation = Recommendation(
        food_batch_id=food_batch_id,
        recommendation_type=recommendation_type,
        priority=priority.value,
        message=message,
        source=RecommendationSource.AUTOMATIC.value,
        condition_key=condition_key,
        status=RecommendationStatus.NEW.value,
        completed_at=None,
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)
    return recommendation


def update_status(db: Session, r: Recommendation, status: RecommendationStatus) -> Recommendation:
    r.status = status.value
    r.completed_at = datetime.now(UTC) if status is RecommendationStatus.COMPLETED else None
    db.commit()
    db.refresh(r)
    return r


def delete_recommendation(db: Session, r: Recommendation):
    db.delete(r)
    db.commit()
