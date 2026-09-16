"""Dashboard aggregates from existing inventory, scoring, storage, and alert records.

Storage compliance reuses the prototype fruit-storage temperature and humidity
bands already used by freshness scoring and automatic storage alerts. It is not
a new scientific standard. Air circulation and light have no compliance policy.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.alert import Alert
from app.models.food_batch import FoodBatch
from app.models.freshness_analysis import FreshnessAnalysis
from app.models.freshness_score import FreshnessScore
from app.models.shelf_life_prediction import ShelfLifePrediction
from app.models.storage_condition import StorageCondition
from app.schemas.dashboard import (
    DashboardSummary,
    EatMeFirstItem,
    RecentBatchItem,
    StorageComplianceSummary,
)
from app.schemas.inventory import ExpiryStatus
from app.services.automatic_alerts import (
    FRESHNESS_HIGH_BELOW,
    FRESHNESS_MEDIUM_BELOW,
    HUMIDITY_LOW_SCORE,
    TEMPERATURE_MODERATE_SCORE,
    TEMPERATURE_SEVERE_SCORE,
)
from app.services.freshness_scoring import (
    COMPLETE,
    HUMIDITY_ABOVE_RANGE_SCORE,
    _humidity_score,
    _storage_inputs,
    _temperature_score,
)

EAT_ME_FIRST_LIMIT = 5
RECENT_BATCH_LIMIT = 5


def _expiry_status(expiry_date: date | None) -> str:
    """Reuse the inventory API's recorded-date expiry labels."""
    if expiry_date is None:
        return ExpiryStatus.UNKNOWN.value
    today = date.today()
    if expiry_date < today:
        return ExpiryStatus.EXPIRED.value
    if expiry_date <= today + timedelta(days=7):
        return ExpiryStatus.NEAR_EXPIRY.value
    return ExpiryStatus.FRESH.value


def _latest_complete_scores(db: Session) -> dict[int, FreshnessScore]:
    """Latest complete, non-null composite score per batch (PostgreSQL DISTINCT ON)."""
    statement = (
        select(FreshnessScore)
        .where(
            FreshnessScore.status == COMPLETE,
            FreshnessScore.freshness_score.is_not(None),
        )
        .distinct(FreshnessScore.food_batch_id)
        .order_by(
            FreshnessScore.food_batch_id,
            FreshnessScore.created_at.desc(),
            FreshnessScore.id.desc(),
        )
    )
    return {row.food_batch_id: row for row in db.scalars(statement)}


def _latest_analyses(db: Session) -> dict[int, FreshnessAnalysis]:
    statement = (
        select(FreshnessAnalysis)
        .distinct(FreshnessAnalysis.food_batch_id)
        .order_by(
            FreshnessAnalysis.food_batch_id,
            FreshnessAnalysis.analyzed_at.desc(),
            FreshnessAnalysis.id.desc(),
        )
    )
    return {row.food_batch_id: row for row in db.scalars(statement)}


def _latest_storage_conditions(db: Session) -> dict[int, StorageCondition]:
    statement = (
        select(StorageCondition)
        .distinct(StorageCondition.food_batch_id)
        .order_by(
            StorageCondition.food_batch_id,
            StorageCondition.recorded_at.desc(),
            StorageCondition.id.desc(),
        )
    )
    return {row.food_batch_id: row for row in db.scalars(statement)}


def _latest_shelf_life_predictions(db: Session) -> dict[int, ShelfLifePrediction]:
    statement = (
        select(ShelfLifePrediction)
        .distinct(ShelfLifePrediction.food_batch_id)
        .order_by(
            ShelfLifePrediction.food_batch_id,
            ShelfLifePrediction.predicted_at.desc(),
            ShelfLifePrediction.id.desc(),
        )
    )
    return {row.food_batch_id: row for row in db.scalars(statement)}


def _supported_rotten(analysis: FreshnessAnalysis | None) -> bool:
    result = analysis.analysis_result if analysis and isinstance(analysis.analysis_result, dict) else {}
    scope = result.get("model_scope")
    predicted_class = result.get("predicted_class")
    if not isinstance(scope, dict) or scope.get("supported") is not True:
        return False
    return isinstance(predicted_class, str) and predicted_class.startswith("rotten")


def _would_generate_storage_alert(temperature_f: Decimal, humidity: Decimal) -> bool:
    """True when existing automatic-alert storage bands would fire."""
    temperature_score = _temperature_score(temperature_f)
    humidity_score = _humidity_score(humidity)
    return temperature_score in (TEMPERATURE_SEVERE_SCORE, TEMPERATURE_MODERATE_SCORE) or humidity_score in (
        HUMIDITY_LOW_SCORE,
        HUMIDITY_ABOVE_RANGE_SCORE,
    )


def _consumption_priority(score: Decimal) -> str:
    if score < FRESHNESS_HIGH_BELOW:
        return "High"
    if score < FRESHNESS_MEDIUM_BELOW:
        return "Medium"
    return "Low"


def _score_value(score: FreshnessScore) -> Decimal:
    return Decimal(str(score.freshness_score))


def build_dashboard_summary(db: Session, *, user_id: int) -> DashboardSummary:
    """Assemble live dashboard metrics from recorded application data."""
    batches = list(
        db.scalars(
            select(FoodBatch)
            .options(selectinload(FoodBatch.food_item))
            .order_by(FoodBatch.created_at.desc(), FoodBatch.id.desc())
        )
    )
    latest_scores = _latest_complete_scores(db)
    latest_analyses = _latest_analyses(db)
    latest_conditions = _latest_storage_conditions(db)
    latest_predictions = _latest_shelf_life_predictions(db)

    scored_values = [_score_value(latest_scores[batch.id]) for batch in batches if batch.id in latest_scores]
    average = (
        (sum(scored_values) / Decimal(len(scored_values))).quantize(Decimal("0.01"))
        if scored_values
        else None
    )

    ai_risk_batch_count = sum(
        1
        for batch in batches
        if (batch.id in latest_scores and _score_value(latest_scores[batch.id]) < FRESHNESS_HIGH_BELOW)
        or _supported_rotten(latest_analyses.get(batch.id))
    )

    active_alert_count = db.scalar(
        select(func.count()).select_from(Alert).where(
            Alert.user_id == user_id,
            Alert.is_dismissed.is_(False),
        )
    ) or 0

    compliant = noncompliant = unknown = 0
    for batch in batches:
        temperature_f, humidity, _source = _storage_inputs(
            latest_conditions.get(batch.id),
            latest_predictions.get(batch.id),
        )
        if temperature_f is None or humidity is None:
            unknown += 1
            continue
        if _would_generate_storage_alert(temperature_f, humidity):
            noncompliant += 1
        else:
            compliant += 1

    ranked = sorted(
        (batch for batch in batches if batch.id in latest_scores),
        key=lambda batch: (_score_value(latest_scores[batch.id]), batch.id),
    )
    eat_me_first = [
        EatMeFirstItem(
            food_batch_id=batch.id,
            batch_number=batch.batch_number,
            product_name=batch.food_item.name if batch.food_item else "Unknown product",
            freshness_score=_score_value(latest_scores[batch.id]),
            storage_location=batch.storage_location,
            expiry_date=batch.expiry_date,
            priority=_consumption_priority(_score_value(latest_scores[batch.id])),
        )
        for batch in ranked[:EAT_ME_FIRST_LIMIT]
    ]

    recent_batches = [
        RecentBatchItem(
            food_batch_id=batch.id,
            batch_number=batch.batch_number,
            product_name=batch.food_item.name if batch.food_item else "Unknown product",
            expiry_status=_expiry_status(batch.expiry_date),
            storage_location=batch.storage_location,
            quantity=float(batch.quantity),
            unit=batch.unit,
            created_at=batch.created_at,
            updated_at=batch.updated_at,
            latest_freshness_score=_score_value(latest_scores[batch.id]) if batch.id in latest_scores else None,
        )
        for batch in batches[:RECENT_BATCH_LIMIT]
    ]

    return DashboardSummary(
        total_monitored_batches=len(batches),
        average_freshness_score=average,
        scored_batch_count=len(scored_values),
        ai_risk_batch_count=ai_risk_batch_count,
        active_alert_count=active_alert_count,
        storage_compliance=StorageComplianceSummary(
            evaluated=compliant + noncompliant,
            compliant=compliant,
            noncompliant=noncompliant,
            unknown=unknown,
        ),
        eat_me_first=eat_me_first,
        recent_batches=recent_batches,
    )
