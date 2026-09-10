"""Trained shelf-life model inference and prediction persistence."""

from functools import lru_cache
from math import isfinite
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.freshness_analysis import FreshnessAnalysis
from app.models.food_batch import FoodBatch
from app.models.shelf_life_prediction import ShelfLifePrediction
from app.schemas.shelf_life import ShelfLifePredictionRequest

MODEL_PATH = Path(__file__).resolve().parents[3] / "ml" / "artifacts" / "shelf_life_model.joblib"
FEATURE_NAMES = ("dwell_hours", "mean_temp_F", "mean_rh_pct", "door_opens_count")


class ShelfLifeModelUnavailableError(RuntimeError):
    """The persisted shelf-life model or its dependencies are unavailable."""


class ShelfLifeInferenceError(RuntimeError):
    """The shelf-life model did not return a usable numeric prediction."""


@lru_cache(maxsize=1)
def _model():
    if not MODEL_PATH.is_file():
        raise ShelfLifeModelUnavailableError("Shelf-life model file is missing.")
    try:
        import joblib
        return joblib.load(MODEL_PATH)
    except Exception as exc:
        raise ShelfLifeModelUnavailableError("Shelf-life model could not be loaded.") from exc


def _raw_prediction(payload: ShelfLifePredictionRequest) -> float:
    try:
        import pandas as pd
        inputs = pd.DataFrame(
            [[payload.dwell_hours, payload.mean_temp_F, payload.mean_rh_pct, payload.door_opens_count]],
            columns=FEATURE_NAMES,
        )
        value = float(_model().predict(inputs)[0])
    except ShelfLifeModelUnavailableError:
        raise
    except Exception as exc:
        raise ShelfLifeInferenceError("Shelf-life model inference failed.") from exc
    if not isfinite(value):
        raise ShelfLifeInferenceError("Shelf-life model returned an invalid prediction.")
    return value


def get_batch(db: Session, batch_id: int) -> FoodBatch | None:
    return db.get(FoodBatch, batch_id)


def get_freshness_analysis(db: Session, analysis_id: int) -> FreshnessAnalysis | None:
    return db.get(FreshnessAnalysis, analysis_id)


def get_prediction(db: Session, prediction_id: int) -> ShelfLifePrediction | None:
    return db.get(ShelfLifePrediction, prediction_id)


def list_predictions(db: Session, batch_id: int) -> list[ShelfLifePrediction]:
    return list(db.scalars(select(ShelfLifePrediction).where(ShelfLifePrediction.food_batch_id == batch_id).order_by(ShelfLifePrediction.predicted_at.desc(), ShelfLifePrediction.id.desc())))


def predict_shelf_life(db: Session, payload: ShelfLifePredictionRequest) -> ShelfLifePrediction:
    """Run the trained model and persist its raw, unit-unestablished output."""
    raw_prediction = _raw_prediction(payload)
    result = {
        "status": "complete",
        "model_status": "complete",
        "model": "shelf_life_model.joblib",
        "prediction_source": "trained_ml_model",
        "raw_prediction": raw_prediction,
        "unit_status": "unit not established",
        "message": "Raw output from the trained shelf-life model. Its unit is not established by the artifact.",
        "model_inputs": {
            "dwell_hours": payload.dwell_hours,
            "mean_temp_F": payload.mean_temp_F,
            "mean_rh_pct": payload.mean_rh_pct,
            "door_opens_count": payload.door_opens_count,
        },
    }
    if payload.freshness_analysis_id is not None:
        result["freshness_analysis_id"] = payload.freshness_analysis_id
    prediction = ShelfLifePrediction(
        food_batch_id=payload.food_batch_id,
        temperature=payload.mean_temp_F,
        humidity=payload.mean_rh_pct,
        storage_duration=payload.dwell_hours,
        prediction_result=result,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def delete_prediction(db: Session, prediction: ShelfLifePrediction) -> None:
    db.delete(prediction)
    db.commit()
