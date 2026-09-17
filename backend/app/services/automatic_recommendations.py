"""Condition-driven automatic recommendations from recorded batch data.

Shelf-life output has no established unit, so this module does not invent a
threshold or emit recommendations from the raw numeric prediction.
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import RecommendationType
from app.models.food_batch import FoodBatch
from app.schemas.recommendations import RecommendationPriority
from app.services.freshness_scoring import (
    COMPLETE,
    HUMIDITY_ABOVE_RANGE_SCORE,
    _humidity_score,
    _latest_analysis,
    _latest_shelf_life_prediction,
    _latest_storage_condition,
    _storage_inputs,
    _temperature_score,
    list_batch_scores,
)
from app.services.recommendations import persist_automatic_recommendation
from app.services.storage import evaluate_compliance, rule_for_batch


FRESHNESS_HIGH_BELOW = Decimal("40")
FRESHNESS_MEDIUM_BELOW = Decimal("60")
TEMPERATURE_SEVERE_SCORE = Decimal("20")
TEMPERATURE_MODERATE_SCORE = Decimal("50")
HUMIDITY_LOW_SCORE = Decimal("40")


def _batch_context(batch: FoodBatch) -> str:
    product = batch.food_item.name if batch.food_item else "Unknown product"
    return f"{product} · batch {batch.batch_number}"


def _spoilage_candidate(db: Session, batch: FoodBatch) -> dict | None:
    analysis = _latest_analysis(db, batch.id)
    result = analysis.analysis_result if analysis and isinstance(analysis.analysis_result, dict) else {}
    scope = result.get("model_scope")
    predicted_class = result.get("predicted_class")
    if not isinstance(scope, dict) or scope.get("supported") is not True:
        return None
    if not isinstance(predicted_class, str) or not predicted_class.startswith("rotten"):
        return None
    context = _batch_context(batch)
    return {
        "recommendation_type": RecommendationType.WASTE_REDUCTION,
        "priority": RecommendationPriority.HIGH,
        "message": (
            f"Inspect and remove {context} from fresh inventory. The latest supported image "
            f"analysis predicted {predicted_class}; do not distribute or consume this batch."
        ),
        "condition_key": f"spoilage:rotten:{predicted_class}",
    }


def _freshness_candidate(db: Session, batch: FoodBatch) -> dict | None:
    scores = list_batch_scores(db, batch.id)
    score = next(
        (
            entry
            for entry in scores
            if entry.status == COMPLETE and entry.freshness_score is not None
        ),
        None,
    )
    if score is None:
        return None
    value = Decimal(str(score.freshness_score))
    context = _batch_context(batch)
    if value < FRESHNESS_HIGH_BELOW:
        return {
            "recommendation_type": RecommendationType.CONSUMPTION,
            "priority": RecommendationPriority.HIGH,
            "message": (
                f"Prioritize immediate inspection, consumption, or disposition of {context}. "
                f"The latest valid composite freshness score is {value}/100."
            ),
            "condition_key": "freshness:high",
        }
    if value < FRESHNESS_MEDIUM_BELOW:
        return {
            "recommendation_type": RecommendationType.INVENTORY_ROTATION,
            "priority": RecommendationPriority.MEDIUM,
            "message": (
                f"Prioritize {context} before fresher inventory. The latest valid composite "
                f"freshness score is {value}/100."
            ),
            "condition_key": "freshness:medium",
        }
    return None


def _storage_candidate(db: Session, batch: FoodBatch) -> dict | None:
    condition = _latest_storage_condition(db, batch.id)
    rule = rule_for_batch(db, batch)
    rule_compliance = evaluate_compliance(condition, rule)
    rule_violations = [item["condition"] for item in rule_compliance["conditions"] if item["status"] == "Needs Attention"]
    if rule_violations:
        context = _batch_context(batch)
        return {
            "recommendation_type": RecommendationType.STORAGE,
            "priority": RecommendationPriority.MEDIUM,
            "message": f"Review storage controls for {context}: " + ", ".join(rule_violations) + " are outside the configured range.",
            "condition_key": "storage:rules:" + "|".join(sorted(name.lower().replace(" ", "_") for name in rule_violations)),
        }
    prediction = _latest_shelf_life_prediction(db, batch.id)
    temperature_f, humidity, source = _storage_inputs(condition, prediction)
    if temperature_f is None or humidity is None:
        return None
    temperature_score = _temperature_score(temperature_f)
    humidity_score = _humidity_score(humidity)
    parts = []
    actions = []
    if temperature_score in (TEMPERATURE_SEVERE_SCORE, TEMPERATURE_MODERATE_SCORE):
        parts.append("temp_severe" if temperature_score == TEMPERATURE_SEVERE_SCORE else "temp_moderate")
        actions.append(
            f"Move this batch to suitable temperature-controlled storage; recorded temperature "
            f"{temperature_f}°F is outside the project's documented acceptable bands"
        )
    if humidity_score == HUMIDITY_LOW_SCORE:
        parts.append("humidity_low")
        actions.append(
            f"Correct storage humidity; recorded humidity {humidity}% is below the project's "
            "documented 60% band"
        )
    elif humidity_score == HUMIDITY_ABOVE_RANGE_SCORE:
        parts.append("humidity_high")
        actions.append(
            f"Correct storage humidity; recorded humidity {humidity}% is above the project's "
            "documented 95% range"
        )
    if not parts:
        return None
    priority = (
        RecommendationPriority.HIGH
        if "temp_severe" in parts or "humidity_low" in parts
        else RecommendationPriority.MEDIUM
    )
    context = _batch_context(batch)
    origin = (
        "recorded storage conditions"
        if source == "storage_condition_celsius"
        else "recorded shelf-life model inputs"
    )
    return {
        "recommendation_type": RecommendationType.STORAGE,
        "priority": priority,
        "message": f"For {context} using {origin}: " + "; ".join(actions) + ".",
        "condition_key": "storage:" + "|".join(sorted(parts)),
    }


def evaluate_automatic_recommendations(db: Session, *, food_batch_id: int) -> list:
    """Evaluate current batch records and persist any new automatic recommendations."""
    batch = db.scalar(
        select(FoodBatch).options(selectinload(FoodBatch.food_item)).where(FoodBatch.id == food_batch_id)
    )
    if batch is None:
        return []
    created = []
    for candidate in (
        _spoilage_candidate(db, batch),
        _freshness_candidate(db, batch),
        _storage_candidate(db, batch),
    ):
        if candidate is None:
            continue
        created.append(
            persist_automatic_recommendation(
                db,
                food_batch_id=food_batch_id,
                **candidate,
            )
        )
    return created
