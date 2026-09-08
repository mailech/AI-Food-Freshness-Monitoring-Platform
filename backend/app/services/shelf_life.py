"""Replaceable non-ML shelf-life prediction persistence."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.freshness_analysis import FreshnessAnalysis
from app.models.food_batch import FoodBatch
from app.models.shelf_life_prediction import ShelfLifePrediction
from app.schemas.shelf_life import ShelfLifePredictionRequest


def get_batch(db: Session, batch_id: int) -> FoodBatch | None:
    return db.get(FoodBatch, batch_id)


def get_freshness_analysis(db: Session, analysis_id: int) -> FreshnessAnalysis | None:
    return db.get(FreshnessAnalysis, analysis_id)


def get_prediction(db: Session, prediction_id: int) -> ShelfLifePrediction | None:
    return db.get(ShelfLifePrediction, prediction_id)


def list_predictions(db: Session, batch_id: int) -> list[ShelfLifePrediction]:
    return list(db.scalars(select(ShelfLifePrediction).where(ShelfLifePrediction.food_batch_id == batch_id).order_by(ShelfLifePrediction.predicted_at.desc(), ShelfLifePrediction.id.desc())))


def predict_shelf_life(db: Session, payload: ShelfLifePredictionRequest) -> ShelfLifePrediction:
    """Persist input context only; a future model can replace this boundary."""
    result = {
        "status": "pending_model_integration",
        "message": "No trained shelf-life model is configured.",
    }
    if payload.freshness_analysis_id is not None:
        result["freshness_analysis_id"] = payload.freshness_analysis_id
    prediction = ShelfLifePrediction(
        food_batch_id=payload.food_batch_id,
        temperature=payload.temperature,
        humidity=payload.humidity,
        packaging=payload.packaging,
        storage_duration=payload.storage_duration,
        prediction_result=result,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def delete_prediction(db: Session, prediction: ShelfLifePrediction) -> None:
    db.delete(prediction)
    db.commit()
