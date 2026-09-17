"""Condition-driven automatic alerts from recorded batch data.

Shelf-life output has no established unit, so this module does not invent a
shelf-life threshold or emit Shelf Life alerts.
"""

from decimal import Decimal

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.models.enums import AlertCategory
from app.models.food_batch import FoodBatch
from app.schemas.alerts import AlertPriority
from app.services.alerts import persist_automatic_alert
from app.services.storage import evaluate_compliance, rule_for_batch
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
        "category": AlertCategory.SPOILAGE,
        "priority": AlertPriority.HIGH,
        "title": "Spoilage detected",
        "message": (
            f"Automatic spoilage alert for {context}. The latest supported image analysis "
            f"predicted {predicted_class}."
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
    if value < FRESHNESS_HIGH_BELOW:
        priority = AlertPriority.HIGH
        state = "high"
        label = "low composite freshness score"
    elif value < FRESHNESS_MEDIUM_BELOW:
        priority = AlertPriority.MEDIUM
        state = "medium"
        label = "composite freshness warning"
    else:
        return None
    context = _batch_context(batch)
    return {
        "category": AlertCategory.FRESHNESS,
        "priority": priority,
        "title": "Freshness alert" if priority is AlertPriority.HIGH else "Freshness warning",
        "message": (
            f"Automatic {label} for {context}. The latest valid composite freshness score is "
            f"{value}/100."
        ),
        "condition_key": f"freshness:{state}",
    }


def _storage_candidate(db: Session, batch: FoodBatch) -> dict | None:
    condition = _latest_storage_condition(db, batch.id)
    rule = rule_for_batch(db, batch)
    rule_compliance = evaluate_compliance(condition, rule)
    rule_violations = [item["condition"] for item in rule_compliance["conditions"] if item["status"] == "Needs Attention"]
    if rule_violations:
        context = _batch_context(batch)
        return {
            "category": AlertCategory.STORAGE,
            "priority": AlertPriority.MEDIUM,
            "title": "Storage condition alert",
            "message": f"Storage conditions need attention for {context}: " + ", ".join(rule_violations) + " are outside the configured range.",
            "condition_key": "storage:rules:" + "|".join(sorted(name.lower().replace(" ", "_") for name in rule_violations)),
        }
    prediction = _latest_shelf_life_prediction(db, batch.id)
    temperature_f, humidity, source = _storage_inputs(condition, prediction)
    if temperature_f is None or humidity is None:
        return None
    temperature_score = _temperature_score(temperature_f)
    humidity_score = _humidity_score(humidity)
    parts = []
    details = []
    if temperature_score == TEMPERATURE_SEVERE_SCORE:
        parts.append("temp_severe")
        details.append(f"temperature {temperature_f}°F is in the project's lowest documented band")
    elif temperature_score == TEMPERATURE_MODERATE_SCORE:
        parts.append("temp_moderate")
        details.append(f"temperature {temperature_f}°F is in the project's second-lowest documented band")
    if humidity_score == HUMIDITY_LOW_SCORE:
        parts.append("humidity_low")
        details.append(f"humidity {humidity}% is below the project's documented 60% band")
    elif humidity_score == HUMIDITY_ABOVE_RANGE_SCORE:
        parts.append("humidity_high")
        details.append(f"humidity {humidity}% is above the project's documented 95% range")
    if not parts:
        return None
    priority = (
        AlertPriority.HIGH
        if "temp_severe" in parts or "humidity_low" in parts
        else AlertPriority.MEDIUM
    )
    context = _batch_context(batch)
    origin = "recorded storage conditions" if source == "storage_condition_celsius" else "recorded shelf-life model inputs"
    return {
        "category": AlertCategory.STORAGE,
        "priority": priority,
        "title": "Storage condition alert",
        "message": (
            f"Automatic storage alert for {context} using {origin}: " + "; ".join(details) + "."
        ),
        "condition_key": "storage:" + "|".join(sorted(parts)),
    }


def evaluate_automatic_alerts(db: Session, *, food_batch_id: int, user_id: int) -> list:
    """Evaluate current batch records and persist any new automatic alerts for the actor."""
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
            persist_automatic_alert(
                db,
                user_id=user_id,
                food_batch_id=food_batch_id,
                **candidate,
            )
        )
    return created
