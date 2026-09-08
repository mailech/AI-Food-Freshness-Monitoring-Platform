"""Persistence and future calculation boundary for composite freshness scores."""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.food_batch import FoodBatch
from app.models.freshness_score import FreshnessScore

VISUAL_WEIGHT = Decimal("0.40")
STORAGE_WEIGHT = Decimal("0.25")
SHELF_LIFE_WEIGHT = Decimal("0.20")
PRODUCT_AGE_WEIGHT = Decimal("0.15")
PENDING_MODEL_INTEGRATION = "pending_model_integration"


def get_batch(db: Session, food_batch_id: int) -> FoodBatch | None:
    """Return a batch for scoring-evaluation validation."""
    return db.get(FoodBatch, food_batch_id)


def get_freshness_score(db: Session, score_id: int) -> FreshnessScore | None:
    """Return one stored scoring evaluation."""
    return db.get(FreshnessScore, score_id)


def list_batch_scores(db: Session, food_batch_id: int) -> list[FreshnessScore]:
    """Return a batch's scoring history from newest to oldest."""
    statement = (
        select(FreshnessScore)
        .where(FreshnessScore.food_batch_id == food_batch_id)
        .order_by(FreshnessScore.created_at.desc(), FreshnessScore.id.desc())
    )
    return list(db.scalars(statement))


def calculate_freshness_score(score: FreshnessScore) -> Decimal | None:
    """Calculate only when genuine component values have been supplied in the future.

    This function deliberately does not create component values or classifications.
    """
    components = (
        score.visual_freshness_score,
        score.storage_condition_score,
        score.shelf_life_score,
        score.product_age_score,
    )
    if any(component is None for component in components):
        return None
    return (
        score.visual_freshness_score * VISUAL_WEIGHT
        + score.storage_condition_score * STORAGE_WEIGHT
        + score.shelf_life_score * SHELF_LIFE_WEIGHT
        + score.product_age_score * PRODUCT_AGE_WEIGHT
    )


def create_freshness_score(db: Session, food_batch_id: int) -> FreshnessScore:
    """Create a pending evaluation without generating component or final scores."""
    score = FreshnessScore(
        food_batch_id=food_batch_id,
        visual_weight=VISUAL_WEIGHT,
        storage_weight=STORAGE_WEIGHT,
        shelf_life_weight=SHELF_LIFE_WEIGHT,
        product_age_weight=PRODUCT_AGE_WEIGHT,
        status=PENDING_MODEL_INTEGRATION,
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return score


def delete_freshness_score(db: Session, score: FreshnessScore) -> None:
    """Delete one scoring evaluation."""
    db.delete(score)
    db.commit()
