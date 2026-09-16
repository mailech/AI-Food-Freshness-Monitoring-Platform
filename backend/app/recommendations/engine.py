"""Rule-based recommendation engine.

Every recommendation is produced by a named rule with an explicit `rule_id`,
human-readable `rationale` and the `evidence` that fired it. This keeps output
explainable and testable: a reviewer can trace any suggestion back to the exact
inputs that caused it.

Rules are grouped by the five required categories:

STORAGE              move / adjust the environment
CONSUMPTION          use, sell or discard priority
INVENTORY_ROTATION   FIFO / FEFO guidance
WASTE_REDUCTION      markdown, redistribution, portioning
QUALITY_IMPROVEMENT  inspection, handling and process fixes
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.category_rules import get_profile
from app.core.enums import (
    ComplianceStatus,
    FreshnessCategory,
    RecommendationPriority,
    RecommendationType,
)
from app.models import FoodBatch, FreshnessAssessment, Recommendation


# --------------------------------------------------------------- rule context
@dataclass
class RuleContext:
    """Everything the rules are allowed to look at."""

    batch: FoodBatch
    category_slug: str | None
    product_name: str
    freshness_score: float | None = None
    freshness_category: str | None = None
    spoilage_probability: float | None = None
    detected_indicators: list[dict[str, Any]] = field(default_factory=list)
    remaining_shelf_life_days: float | None = None
    predicted_expiry: date | None = None
    risk_level: str | None = None
    temperature_c: float | None = None
    humidity_pct: float | None = None
    air_circulation: str | None = None
    compliance_status: str | None = None
    storage_violations: list[dict[str, Any]] = field(default_factory=list)
    storage_score: float | None = None
    product_age_days: float | None = None
    quantity: float = 0.0
    unit: str = "kg"
    days_until_expiry: int | None = None

    @property
    def profile(self):
        return get_profile(self.category_slug)

    def indicator(self, indicator_type: str) -> dict[str, Any] | None:
        for item in self.detected_indicators:
            if str(item.get("indicator_type")) == indicator_type:
                return item
        return None


@dataclass
class Suggestion:
    rule_id: str
    recommendation_type: RecommendationType
    priority: RecommendationPriority
    title: str
    message: str
    rationale: str
    action_label: str | None = None
    expected_impact: str | None = None
    evidence: dict[str, Any] = field(default_factory=dict)


Rule = Callable[[RuleContext], Suggestion | None]
_RULES: list[Rule] = []


def rule(func: Rule) -> Rule:
    """Register a rule function."""
    _RULES.append(func)
    return func


# ------------------------------------------------------------ storage rules
@rule
def r_storage_temperature_high(ctx: RuleContext) -> Suggestion | None:
    violation = next(
        (v for v in ctx.storage_violations if v.get("parameter") == "temperature"), None
    )
    if not violation or (violation.get("deviation") or 0) <= 0:
        return None
    rule_ = ctx.profile.storage_rule
    deviation = float(violation["deviation"])
    priority = (
        RecommendationPriority.URGENT
        if deviation > 3 or ctx.profile.perishability > 0.85
        else RecommendationPriority.HIGH
    )
    return Suggestion(
        rule_id="STORAGE_TEMP_ABOVE_MAX",
        recommendation_type=RecommendationType.STORAGE,
        priority=priority,
        title="Move this batch to a cooler storage area",
        message=(
            f"Move batch {ctx.batch.batch_number} ({ctx.product_name}) to a cooler area. "
            f"The recommended range for {ctx.profile.name.lower()} is "
            f"{rule_.temp_min_c:.0f}-{rule_.temp_max_c:.0f} C."
        ),
        rationale=str(violation.get("message")),
        action_label="Relocate batch",
        expected_impact=(
            f"Removing a {deviation:.1f} C excursion slows spoilage and can recover "
            "several days of shelf life."
        ),
        evidence={"violation": violation, "required": {
            "temp_min_c": rule_.temp_min_c, "temp_max_c": rule_.temp_max_c}},
    )


@rule
def r_storage_temperature_low(ctx: RuleContext) -> Suggestion | None:
    violation = next(
        (v for v in ctx.storage_violations if v.get("parameter") == "temperature"), None
    )
    if not violation or (violation.get("deviation") or 0) >= 0:
        return None
    rule_ = ctx.profile.storage_rule
    return Suggestion(
        rule_id="STORAGE_TEMP_BELOW_MIN",
        recommendation_type=RecommendationType.STORAGE,
        priority=RecommendationPriority.MEDIUM,
        title="Raise the storage temperature",
        message=(
            f"Batch {ctx.batch.batch_number} is colder than recommended. Raise the set "
            f"point into the {rule_.temp_min_c:.0f}-{rule_.temp_max_c:.0f} C band to avoid "
            "chill injury and texture damage."
        ),
        rationale=str(violation.get("message")),
        action_label="Adjust set point",
        expected_impact="Prevents chill injury, freeze damage and texture loss.",
        evidence={"violation": violation},
    )


@rule
def r_storage_humidity(ctx: RuleContext) -> Suggestion | None:
    violation = next(
        (v for v in ctx.storage_violations if v.get("parameter") == "humidity"), None
    )
    if not violation:
        return None
    too_high = (violation.get("deviation") or 0) > 0
    return Suggestion(
        rule_id="STORAGE_HUMIDITY_HIGH" if too_high else "STORAGE_HUMIDITY_LOW",
        recommendation_type=RecommendationType.STORAGE,
        priority=RecommendationPriority.MEDIUM,
        title="Dehumidify the storage area" if too_high else "Increase storage humidity",
        message=(
            (
                f"Reduce humidity around batch {ctx.batch.batch_number}. Excess moisture is "
                "the main driver of mould growth for "
            )
            if too_high
            else (
                f"Increase humidity around batch {ctx.batch.batch_number} or cover the "
                "produce. Dry air causes weight loss and shrivelling for "
            )
        )
        + f"{ctx.profile.name.lower()}.",
        rationale=str(violation.get("message")),
        action_label="Adjust humidity",
        expected_impact="Reduces mould risk." if too_high else "Reduces moisture loss and shrivelling.",
        evidence={"violation": violation},
    )


@rule
def r_storage_circulation(ctx: RuleContext) -> Suggestion | None:
    if not ctx.air_circulation or str(ctx.air_circulation).upper() != "POOR":
        return None
    return Suggestion(
        rule_id="STORAGE_POOR_CIRCULATION",
        recommendation_type=RecommendationType.STORAGE,
        priority=RecommendationPriority.LOW,
        title="Improve air circulation",
        message=(
            f"Re-stack batch {ctx.batch.batch_number} to allow airflow. Poor circulation "
            "creates warm, humid pockets even when the room average looks correct."
        ),
        rationale="Air circulation was recorded as POOR for this batch.",
        action_label="Re-stack / space out",
        expected_impact="Removes local hot spots that shorten shelf life unevenly.",
        evidence={"air_circulation": ctx.air_circulation},
    )


# -------------------------------------------------------- consumption rules
@rule
def r_consume_spoiled(ctx: RuleContext) -> Suggestion | None:
    if ctx.freshness_category != FreshnessCategory.SPOILED.value:
        return None
    return Suggestion(
        rule_id="CONSUME_DISCARD_SPOILED",
        recommendation_type=RecommendationType.CONSUMPTION,
        priority=RecommendationPriority.URGENT,
        title="Remove this batch from stock",
        message=(
            f"Batch {ctx.batch.batch_number} ({ctx.product_name}) is classified as SPOILED "
            f"with a freshness score of {ctx.freshness_score:.0f}/100. Remove it from sale "
            "or consumption and dispose of it according to your waste policy."
        ),
        rationale=(
            "The visual assessment placed this batch in the lowest freshness band. "
            "This is an AI estimate - confirm by physical inspection before disposal."
        ),
        action_label="Quarantine and discard",
        expected_impact="Prevents distribution of unsafe product.",
        evidence={
            "freshness_score": ctx.freshness_score,
            "spoilage_probability": ctx.spoilage_probability,
            "indicators": [i.get("indicator_type") for i in ctx.detected_indicators],
        },
    )


@rule
def r_consume_priority(ctx: RuleContext) -> Suggestion | None:
    if ctx.remaining_shelf_life_days is None:
        return None
    remaining = float(ctx.remaining_shelf_life_days)
    if remaining > 3 or ctx.freshness_category == FreshnessCategory.SPOILED.value:
        return None
    priority = (
        RecommendationPriority.URGENT if remaining <= 1 else RecommendationPriority.HIGH
    )
    return Suggestion(
        rule_id="CONSUME_PRIORITISE_SHORT_LIFE",
        recommendation_type=RecommendationType.CONSUMPTION,
        priority=priority,
        title="Prioritise this batch for consumption",
        message=(
            f"Prioritise batch {ctx.batch.batch_number} ({ctx.product_name}) because its "
            f"estimated remaining shelf life is only {remaining:.1f} day(s)"
            + (f", with predicted expiry on {ctx.predicted_expiry:%d %b %Y}" if ctx.predicted_expiry else "")
            + "."
        ),
        rationale=(
            f"Estimated remaining shelf life {remaining:.1f} day(s); risk level "
            f"{ctx.risk_level or 'MEDIUM'}."
        ),
        action_label="Move to front / use first",
        expected_impact=f"Avoids writing off {ctx.quantity:.0f} {ctx.unit} of stock.",
        evidence={
            "remaining_shelf_life_days": remaining,
            "predicted_expiry": ctx.predicted_expiry.isoformat() if ctx.predicted_expiry else None,
            "risk_level": ctx.risk_level,
        },
    )


@rule
def r_consume_near_spoilage(ctx: RuleContext) -> Suggestion | None:
    if ctx.freshness_category != FreshnessCategory.NEAR_SPOILAGE.value:
        return None
    return Suggestion(
        rule_id="CONSUME_NEAR_SPOILAGE",
        recommendation_type=RecommendationType.CONSUMPTION,
        priority=RecommendationPriority.HIGH,
        title="Use or sell today",
        message=(
            f"Batch {ctx.batch.batch_number} is near spoilage "
            f"({ctx.freshness_score:.0f}/100). Use it today, or process it into a cooked "
            "or preserved product if your operation allows."
        ),
        rationale="Freshness assessment placed the batch in the NEAR_SPOILAGE band.",
        action_label="Use today",
        expected_impact="Recovers value before the batch becomes unsellable.",
        evidence={"freshness_score": ctx.freshness_score},
    )


# ----------------------------------------------------- rotation / waste rules
@rule
def r_rotation_fefo(ctx: RuleContext) -> Suggestion | None:
    if ctx.days_until_expiry is None or ctx.days_until_expiry > 7:
        return None
    strategy = "FEFO" if ctx.profile.perishability >= 0.5 else "FIFO"
    return Suggestion(
        rule_id=f"ROTATION_{strategy}",
        recommendation_type=RecommendationType.INVENTORY_ROTATION,
        priority=(
            RecommendationPriority.HIGH if ctx.days_until_expiry <= 2
            else RecommendationPriority.MEDIUM
        ),
        title=f"Use {strategy} rotation for this inventory",
        message=(
            f"Apply {strategy} rotation: batch {ctx.batch.batch_number} expires in "
            f"{ctx.days_until_expiry} day(s) and should be picked before newer stock of "
            f"{ctx.product_name}."
        ),
        rationale=(
            f"{strategy} chosen because {ctx.profile.name.lower()} has a perishability "
            f"index of {ctx.profile.perishability:.2f}"
            + (" (expiry-driven)." if strategy == "FEFO" else " (arrival-driven).")
        ),
        action_label=f"Apply {strategy}",
        expected_impact="Reduces the chance that older stock expires behind newer stock.",
        evidence={
            "days_until_expiry": ctx.days_until_expiry,
            "strategy": strategy,
            "perishability": ctx.profile.perishability,
        },
    )


@rule
def r_waste_markdown(ctx: RuleContext) -> Suggestion | None:
    if ctx.remaining_shelf_life_days is None or ctx.quantity <= 0:
        return None
    remaining = float(ctx.remaining_shelf_life_days)
    # Meaningful quantity at risk within a short window.
    if remaining > 2.5 or ctx.quantity < 5:
        return None
    if ctx.freshness_category == FreshnessCategory.SPOILED.value:
        return None
    return Suggestion(
        rule_id="WASTE_MARKDOWN_OR_REDISTRIBUTE",
        recommendation_type=RecommendationType.WASTE_REDUCTION,
        priority=RecommendationPriority.HIGH,
        title="Mark down or redistribute to avoid waste",
        message=(
            f"{ctx.quantity:.0f} {ctx.unit} of {ctx.product_name} has roughly "
            f"{remaining:.1f} day(s) left. Apply a markdown, move it to a faster-selling "
            "location, or redistribute it (staff sale, donation) before it is written off."
        ),
        rationale=(
            f"Quantity at risk {ctx.quantity:.0f} {ctx.unit}; remaining shelf life "
            f"{remaining:.1f} day(s)."
        ),
        action_label="Mark down / redistribute",
        expected_impact=(
            f"Potentially recovers value on {ctx.quantity:.0f} {ctx.unit} instead of "
            "disposing of it."
        ),
        evidence={"quantity": ctx.quantity, "remaining_shelf_life_days": remaining},
    )


@rule
def r_waste_large_slow_batch(ctx: RuleContext) -> Suggestion | None:
    if ctx.quantity < 50 or ctx.remaining_shelf_life_days is None:
        return None
    if float(ctx.remaining_shelf_life_days) > 5:
        return None
    return Suggestion(
        rule_id="WASTE_SPLIT_LARGE_BATCH",
        recommendation_type=RecommendationType.WASTE_REDUCTION,
        priority=RecommendationPriority.MEDIUM,
        title="Split this large batch across outlets",
        message=(
            f"Batch {ctx.batch.batch_number} holds {ctx.quantity:.0f} {ctx.unit} with "
            f"{float(ctx.remaining_shelf_life_days):.1f} day(s) of life. Splitting it across "
            "more outlets or channels increases the chance of selling it in time."
        ),
        rationale="Large quantity combined with a short remaining shelf life.",
        action_label="Split allocation",
        expected_impact="Spreads sell-through risk across locations.",
        evidence={"quantity": ctx.quantity},
    )


# ------------------------------------------------------------- quality rules
@rule
def r_quality_inspect_discoloration(ctx: RuleContext) -> Suggestion | None:
    for indicator_type, label in (
        ("DISCOLORATION", "discoloration"),
        ("MOLD", "possible mould"),
        ("BRUISING", "bruising"),
        ("PHYSICAL_DAMAGE", "physical damage"),
    ):
        indicator = ctx.indicator(indicator_type)
        if indicator and float(indicator.get("confidence", 0)) >= 0.3:
            area = float(indicator.get("affected_area_ratio", 0) or 0)
            return Suggestion(
                rule_id=f"QUALITY_INSPECT_{indicator_type}",
                recommendation_type=RecommendationType.QUALITY_IMPROVEMENT,
                priority=(
                    RecommendationPriority.URGENT if indicator_type == "MOLD"
                    else RecommendationPriority.HIGH
                ),
                title=f"Inspect the batch - {label} detected",
                message=(
                    f"Inspect batch {ctx.batch.batch_number} because {label} was detected on "
                    f"roughly {area * 100:.0f}% of the visible surface "
                    f"({float(indicator.get('confidence', 0)):.0%} confidence). Separate any "
                    "affected units before they contaminate the rest of the batch."
                ),
                rationale=str(indicator.get("description") or f"{label} detected by image analysis."),
                action_label="Physical inspection",
                expected_impact="Prevents one affected unit from spoiling the whole batch.",
                evidence={"indicator": indicator},
            )
    return None


@rule
def r_quality_packaging(ctx: RuleContext) -> Suggestion | None:
    packaging = (ctx.batch.packaging_type or "").upper()
    if packaging not in {"", "NONE", "LOOSE"}:
        return None
    if ctx.profile.perishability < 0.6:
        return None
    return Suggestion(
        rule_id="QUALITY_IMPROVE_PACKAGING",
        recommendation_type=RecommendationType.QUALITY_IMPROVEMENT,
        priority=RecommendationPriority.LOW,
        title="Consider protective packaging",
        message=(
            f"{ctx.product_name} is stored {packaging.lower() or 'unpackaged'}. For "
            f"{ctx.profile.name.lower()}, wrapping or vacuum sealing typically extends "
            "usable life noticeably."
        ),
        rationale=(
            f"Category perishability {ctx.profile.perishability:.2f} with no protective "
            "packaging recorded."
        ),
        action_label="Change packaging",
        expected_impact="Vacuum or modified-atmosphere packaging can extend shelf life by 60-80% "
        "relative to loose storage in this model.",
        evidence={"packaging_type": packaging or None},
    )


@rule
def r_quality_no_recent_assessment(ctx: RuleContext) -> Suggestion | None:
    if ctx.freshness_score is not None:
        return None
    return Suggestion(
        rule_id="QUALITY_RUN_ASSESSMENT",
        recommendation_type=RecommendationType.QUALITY_IMPROVEMENT,
        priority=RecommendationPriority.MEDIUM,
        title="Run a freshness analysis for this batch",
        message=(
            f"Batch {ctx.batch.batch_number} has no freshness assessment yet. Upload a photo "
            "and run the analysis to obtain a freshness score, shelf-life estimate and "
            "tailored recommendations."
        ),
        rationale="No FreshnessAssessment record exists for this batch.",
        action_label="Analyse now",
        expected_impact="Unlocks scoring, shelf-life prediction and targeted alerts.",
        evidence={},
    )


@rule
def r_quality_age_vs_life(ctx: RuleContext) -> Suggestion | None:
    if ctx.product_age_days is None:
        return None
    base = ctx.profile.baseline_shelf_life_days
    if ctx.product_age_days < base * 1.25:
        return None
    return Suggestion(
        rule_id="QUALITY_AGE_EXCEEDS_EXPECTATION",
        recommendation_type=RecommendationType.QUALITY_IMPROVEMENT,
        priority=RecommendationPriority.MEDIUM,
        title="Batch is older than its expected life",
        message=(
            f"Batch {ctx.batch.batch_number} is {ctx.product_age_days:.0f} days old, beyond "
            f"the {base:.0f}-day typical life for {ctx.profile.name.lower()}. Verify quality "
            "manually before selling or consuming, regardless of the visual score."
        ),
        rationale=(
            f"Product age {ctx.product_age_days:.0f} days vs. expected {base:.0f} days for "
            "this category."
        ),
        action_label="Manual verification",
        expected_impact="Catches degradation that is not yet visible on the surface.",
        evidence={"product_age_days": ctx.product_age_days, "expected_days": base},
    )


# ------------------------------------------------------------------- engine
def build_context(db: Session, batch: FoodBatch) -> RuleContext:
    """Assemble a rule context from the batch's current state."""
    from app.inventory.service import age_in_days, days_until
    from app.storage.service import batch_storage_snapshot

    assessment = db.scalar(
        select(FreshnessAssessment)
        .where(FreshnessAssessment.batch_id == batch.id)
        .order_by(FreshnessAssessment.created_at.desc())
    )
    snapshot = batch_storage_snapshot(db, batch)
    product = batch.product
    category = product.category if product else None

    indicators: list[dict[str, Any]] = []
    if assessment is not None:
        indicators = [
            {
                "indicator_type": ind.indicator_type,
                "label": ind.label,
                "confidence": ind.confidence,
                "affected_area_ratio": ind.affected_area_ratio,
                "severity": ind.severity,
                "description": ind.description,
            }
            for ind in assessment.indicators
            if ind.detected
        ]

    return RuleContext(
        batch=batch,
        category_slug=category.slug if category else None,
        product_name=product.name if product else f"Batch {batch.batch_number}",
        freshness_score=batch.current_freshness_score,
        freshness_category=batch.current_freshness_category,
        spoilage_probability=assessment.spoilage_probability if assessment else None,
        detected_indicators=indicators,
        remaining_shelf_life_days=batch.remaining_shelf_life_days,
        predicted_expiry=batch.predicted_expiry_date,
        risk_level=None,
        temperature_c=snapshot.get("current", {}).get("temperature_c"),
        humidity_pct=snapshot.get("current", {}).get("humidity_pct"),
        air_circulation=snapshot.get("current", {}).get("air_circulation"),
        compliance_status=snapshot.get("compliance_status"),
        storage_violations=snapshot.get("violations", []),
        storage_score=snapshot.get("storage_score"),
        product_age_days=age_in_days(batch),
        quantity=float(batch.quantity or 0),
        unit=batch.unit,
        days_until_expiry=days_until(batch.expected_expiry_date or batch.predicted_expiry_date),
    )


def evaluate_rules(ctx: RuleContext) -> list[Suggestion]:
    """Run every registered rule and return the suggestions that fired."""
    suggestions: list[Suggestion] = []
    for rule_fn in _RULES:
        try:
            result = rule_fn(ctx)
        except Exception:  # noqa: BLE001 - one broken rule must not stop the rest
            continue
        if result is not None:
            suggestions.append(result)

    order = {
        RecommendationPriority.URGENT: 0,
        RecommendationPriority.HIGH: 1,
        RecommendationPriority.MEDIUM: 2,
        RecommendationPriority.LOW: 3,
    }
    suggestions.sort(key=lambda s: order.get(s.priority, 4))
    return suggestions


def generate_for_batch(
    db: Session,
    batch: FoodBatch,
    *,
    assessment_id: int | None = None,
    persist: bool = True,
) -> list[Recommendation]:
    """Regenerate the recommendation set for a batch.

    Previous active recommendations are deactivated (not deleted) so the history
    of what the system advised remains auditable.
    """
    ctx = build_context(db, batch)
    suggestions = evaluate_rules(ctx)

    if not persist:
        return [
            Recommendation(
                batch_id=batch.id,
                assessment_id=assessment_id,
                recommendation_type=str(s.recommendation_type),
                priority=str(s.priority),
                title=s.title,
                message=s.message,
                rationale=s.rationale,
                rule_id=s.rule_id,
                action_label=s.action_label,
                expected_impact=s.expected_impact,
                evidence=s.evidence,
            )
            for s in suggestions
        ]

    existing = db.scalars(
        select(Recommendation).where(
            Recommendation.batch_id == batch.id, Recommendation.is_active.is_(True)
        )
    ).all()
    for row in existing:
        row.is_active = False

    created: list[Recommendation] = []
    for suggestion in suggestions:
        row = Recommendation(
            batch_id=batch.id,
            assessment_id=assessment_id,
            recommendation_type=str(suggestion.recommendation_type),
            priority=str(suggestion.priority),
            title=suggestion.title,
            message=suggestion.message,
            rationale=suggestion.rationale,
            rule_id=suggestion.rule_id,
            action_label=suggestion.action_label,
            expected_impact=suggestion.expected_impact,
            evidence=suggestion.evidence,
            is_active=True,
        )
        db.add(row)
        created.append(row)
    db.flush()
    return created


def active_for_batch(db: Session, batch_id: int) -> list[Recommendation]:
    return list(
        db.scalars(
            select(Recommendation)
            .where(Recommendation.batch_id == batch_id, Recommendation.is_active.is_(True))
            .order_by(Recommendation.priority, Recommendation.id)
        ).all()
    )


def serialise_recommendation(row: Recommendation) -> dict[str, Any]:
    return {
        "id": row.id,
        "batch_id": row.batch_id,
        "recommendation_type": row.recommendation_type,
        "priority": row.priority,
        "title": row.title,
        "message": row.message,
        "rationale": row.rationale,
        "rule_id": row.rule_id,
        "action_label": row.action_label,
        "expected_impact": row.expected_impact,
        "evidence": row.evidence,
        "acknowledged": row.acknowledged,
        "created_at": row.created_at,
    }


def registered_rule_count() -> int:
    """Exposed for tests and the admin/system view."""
    return len(_RULES)
