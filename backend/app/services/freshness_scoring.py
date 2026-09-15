"""Composite freshness scoring from recorded application and model data."""

from datetime import date
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.food_batch import FoodBatch
from app.models.freshness_analysis import FreshnessAnalysis
from app.models.freshness_score import FreshnessScore
from app.models.shelf_life_prediction import ShelfLifePrediction
from app.models.storage_condition import StorageCondition

VISUAL_WEIGHT = Decimal("0.40")
STORAGE_WEIGHT = Decimal("0.25")
SHELF_LIFE_WEIGHT = Decimal("0.20")
PRODUCT_AGE_WEIGHT = Decimal("0.15")
COMPLETE = "complete"
SCORE_UNAVAILABLE = "score_unavailable"

# Prototype/demo scoring policy. These general fruit-storage bands are kept in
# one place so they can be replaced by category-specific operational limits.
TEMPERATURE_BANDS_F = (
    (Decimal("40"), Decimal("100")),
    (Decimal("45"), Decimal("90")),
    (Decimal("50"), Decimal("75")),
    (Decimal("60"), Decimal("50")),
)
HUMIDITY_BANDS = (
    (Decimal("60"), Decimal("40")),
    (Decimal("75"), Decimal("60")),
    (Decimal("85"), Decimal("75")),
    (Decimal("90"), Decimal("90")),
    (Decimal("95"), Decimal("100")),
)
HUMIDITY_ABOVE_RANGE_SCORE = Decimal("70")
SHELF_LIFE_MIN_OUTPUT = Decimal("0")
SHELF_LIFE_MAX_OUTPUT = Decimal("30")
SHELF_LIFE_UNIT_STATUS = "unit not established; prototype normalized range 0-30"


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
    """Return the required weighted score only when every component is real."""
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
    ).quantize(Decimal("0.01"))


def _latest_analysis(db: Session, food_batch_id: int) -> FreshnessAnalysis | None:
    return db.scalar(select(FreshnessAnalysis).where(FreshnessAnalysis.food_batch_id == food_batch_id).order_by(FreshnessAnalysis.analyzed_at.desc(), FreshnessAnalysis.id.desc()).limit(1))


def _latest_storage_condition(db: Session, food_batch_id: int) -> StorageCondition | None:
    return db.scalar(select(StorageCondition).where(StorageCondition.food_batch_id == food_batch_id).order_by(StorageCondition.recorded_at.desc(), StorageCondition.id.desc()).limit(1))


def _latest_shelf_life_prediction(db: Session, food_batch_id: int) -> ShelfLifePrediction | None:
    return db.scalar(select(ShelfLifePrediction).where(ShelfLifePrediction.food_batch_id == food_batch_id).order_by(ShelfLifePrediction.predicted_at.desc(), ShelfLifePrediction.id.desc()).limit(1))


def _visual_freshness_score(analysis: FreshnessAnalysis | None) -> Decimal | None:
    """Map only a supported model's fresh/rotten class to the visual endpoint scale.

    This deliberately uses the classifier's class, not its confidence: a fresh class
    is 100 and a rotten class is 0 for the visual component only.
    """
    result = analysis.analysis_result if analysis and isinstance(analysis.analysis_result, dict) else {}
    scope = result.get("model_scope")
    predicted_class = result.get("predicted_class")
    if not isinstance(scope, dict) or scope.get("supported") is not True or not isinstance(predicted_class, str):
        return None
    if predicted_class.startswith("fresh"):
        return Decimal("100.00")
    if predicted_class.startswith("rotten"):
        return Decimal("0.00")
    return None


def _product_age_score(batch: FoodBatch) -> Decimal | None:
    """Score elapsed age from the batch's recorded purchase and expiry dates."""
    if batch.purchase_date is None or batch.expiry_date is None:
        return None
    planned_life_days = (batch.expiry_date - batch.purchase_date).days
    if planned_life_days <= 0:
        return None
    remaining_fraction = Decimal((batch.expiry_date - date.today()).days) / Decimal(planned_life_days)
    return (max(Decimal("0"), min(Decimal("1"), remaining_fraction)) * Decimal("100")).quantize(Decimal("0.01"))


def _clamp_score(value: Decimal) -> Decimal:
    return max(Decimal("0"), min(Decimal("100"), value))


def _temperature_score(temperature_f: Decimal) -> Decimal:
    for maximum, score in TEMPERATURE_BANDS_F:
        if temperature_f <= maximum:
            return score
    return Decimal("20")


def _humidity_score(humidity: Decimal) -> Decimal:
    for maximum, score in HUMIDITY_BANDS:
        if humidity < maximum:
            return score
    if humidity <= Decimal("95"):
        return Decimal("100")
    return HUMIDITY_ABOVE_RANGE_SCORE


def _storage_inputs(
    condition: StorageCondition | None, prediction: ShelfLifePrediction | None
) -> tuple[Decimal | None, Decimal | None, str | None]:
    """Return actual recorded inputs in Fahrenheit, preferring sensor records.

    Storage Monitoring records temperature in Celsius. A shelf-life prediction
    records its verified model inputs in Fahrenheit, so those inputs are an
    acceptable fallback only when no StorageCondition reading exists.
    """
    if condition and condition.temperature is not None and condition.humidity is not None:
        temperature_f = Decimal(str(condition.temperature)) * Decimal("9") / Decimal("5") + Decimal("32")
        return temperature_f, Decimal(str(condition.humidity)), "storage_condition_celsius"
    if prediction and prediction.temperature is not None and prediction.humidity is not None:
        return Decimal(str(prediction.temperature)), Decimal(str(prediction.humidity)), "shelf_life_model_inputs_fahrenheit"
    return None, None, None


def _storage_condition_score(temperature_f: Decimal | None, humidity: Decimal | None) -> Decimal | None:
    """Apply the documented prototype fruit-storage policy to real readings."""
    if temperature_f is None or humidity is None:
        return None
    return _clamp_score(
        _temperature_score(temperature_f) * Decimal("0.60")
        + _humidity_score(humidity) * Decimal("0.40")
    ).quantize(Decimal("0.01"))


def _raw_shelf_life_prediction(prediction: ShelfLifePrediction | None) -> Decimal | None:
    result = prediction.prediction_result if prediction and isinstance(prediction.prediction_result, dict) else {}
    value = result.get("raw_prediction")
    try:
        raw = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    return raw if raw.is_finite() else None


def _shelf_life_score(raw_prediction: Decimal | None) -> Decimal | None:
    """Normalize raw output with the documented, configurable prototype range."""
    if raw_prediction is None or SHELF_LIFE_MAX_OUTPUT <= SHELF_LIFE_MIN_OUTPUT:
        return None
    normalized = Decimal("100") * (raw_prediction - SHELF_LIFE_MIN_OUTPUT) / (
        SHELF_LIFE_MAX_OUTPUT - SHELF_LIFE_MIN_OUTPUT
    )
    return _clamp_score(normalized).quantize(Decimal("0.01"))


def _spoilage_probability(analysis: FreshnessAnalysis | None) -> Decimal | None:
    result = analysis.analysis_result if analysis and isinstance(analysis.analysis_result, dict) else {}
    probabilities = result.get("all_class_probabilities")
    if not isinstance(probabilities, dict):
        return None
    try:
        value = sum(Decimal(str(probabilities[name])) for name in probabilities if name.startswith("rotten"))
    except (InvalidOperation, ValueError, TypeError):
        return None
    return value.quantize(Decimal("0.00001")) if value.is_finite() else None


def create_freshness_score(db: Session, food_batch_id: int) -> FreshnessScore:
    """Persist a weighted score when all required data has a valid 0-100 meaning."""
    batch = get_batch(db, food_batch_id)
    if batch is None:
        raise ValueError("Food batch not found.")
    analysis = _latest_analysis(db, food_batch_id)
    condition = _latest_storage_condition(db, food_batch_id)
    prediction = _latest_shelf_life_prediction(db, food_batch_id)
    temperature_f, humidity, storage_source = _storage_inputs(condition, prediction)
    raw_shelf_life = _raw_shelf_life_prediction(prediction)
    score = FreshnessScore(
        food_batch_id=food_batch_id,
        visual_freshness_score=_visual_freshness_score(analysis),
        storage_condition_score=_storage_condition_score(temperature_f, humidity),
        shelf_life_score=_shelf_life_score(raw_shelf_life),
        product_age_score=_product_age_score(batch),
        storage_temperature=temperature_f,
        storage_humidity=humidity,
        storage_source=storage_source,
        shelf_life_raw_prediction=raw_shelf_life,
        shelf_life_unit_status=(prediction.prediction_result or {}).get("unit_status", SHELF_LIFE_UNIT_STATUS) if prediction else None,
        packaging=prediction.packaging if prediction else None,
        spoilage_probability=_spoilage_probability(analysis),
        visual_weight=VISUAL_WEIGHT,
        storage_weight=STORAGE_WEIGHT,
        shelf_life_weight=SHELF_LIFE_WEIGHT,
        product_age_weight=PRODUCT_AGE_WEIGHT,
    )
    score.freshness_score = calculate_freshness_score(score)
    score.status = COMPLETE if score.freshness_score is not None else SCORE_UNAVAILABLE
    db.add(score)
    db.commit()
    db.refresh(score)
    return score


def delete_freshness_score(db: Session, score: FreshnessScore) -> None:
    """Delete one scoring evaluation."""
    db.delete(score)
    db.commit()
