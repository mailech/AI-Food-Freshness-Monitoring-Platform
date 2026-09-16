"""Freshness scoring engine.

Implements the specification's weighted scoring model::

    Freshness Score = 0.40 x Visual Score
                    + 0.25 x Storage Score
                    + 0.20 x Shelf-Life Score
                    + 0.15 x Product Age Score

Every component is normalised to 0-100 before weighting, the weights are
configurable (`WEIGHT_*` settings) and the score-to-category thresholds are
configurable too (`THRESHOLD_*`). Component scores are returned - and persisted
by the caller - so the UI can explain *why* a score was produced.

This module is deliberately free of I/O so it can be unit-tested in isolation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.config import settings
from app.core.category_rules import CategoryProfile, get_profile
from app.core.enums import FreshnessCategory

_EPSILON = 1e-9


def clamp_score(value: float | None, default: float = 50.0) -> float:
    """Clamp any component score into the 0-100 range."""
    if value is None:
        return float(default)
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return float(default)
    if numeric != numeric:  # NaN
        return float(default)
    return float(min(100.0, max(0.0, numeric)))


@dataclass
class ScoreComponents:
    visual: float
    storage: float
    shelf_life: float
    product_age: float

    def as_dict(self) -> dict[str, float]:
        return {
            "visual": round(self.visual, 2),
            "storage": round(self.storage, 2),
            "shelf_life": round(self.shelf_life, 2),
            "product_age": round(self.product_age, 2),
        }


@dataclass
class FreshnessScoreResult:
    score: float
    category: FreshnessCategory
    components: ScoreComponents
    weights: dict[str, float]
    contributions: dict[str, float]
    thresholds: dict[str, float]
    explanation: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "freshness_score": round(self.score, 2),
            "freshness_category": str(self.category),
            "components": self.components.as_dict(),
            "weights": self.weights,
            "contributions": {k: round(v, 2) for k, v in self.contributions.items()},
            "thresholds": self.thresholds,
            "explanation": self.explanation,
        }


def normalise_weights(weights: dict[str, float] | None = None) -> dict[str, float]:
    """Return weights that sum to 1.0 (guards against misconfiguration)."""
    raw = dict(weights or settings.score_weights)
    total = sum(raw.values())
    if total <= _EPSILON:
        # Fall back to the specification defaults rather than dividing by zero.
        return {"visual": 0.40, "storage": 0.25, "shelf_life": 0.20, "product_age": 0.15}
    return {key: value / total for key, value in raw.items()}


def score_to_category(
    score: float, thresholds: dict[str, float] | None = None
) -> FreshnessCategory:
    """Map a 0-100 score to a freshness class using configurable thresholds.

    Default banding: 90-100 Fresh, 75-89 Good, 60-74 Acceptable,
    30-59 Near Spoilage, 0-29 Spoiled.
    """
    limits = thresholds or settings.score_thresholds
    if score >= limits["FRESH"]:
        return FreshnessCategory.FRESH
    if score >= limits["GOOD"]:
        return FreshnessCategory.GOOD
    if score >= limits["ACCEPTABLE"]:
        return FreshnessCategory.ACCEPTABLE
    if score >= limits["NEAR_SPOILAGE"]:
        return FreshnessCategory.NEAR_SPOILAGE
    return FreshnessCategory.SPOILED


# --------------------------------------------------------------- components
def shelf_life_score(
    remaining_days: float | None,
    *,
    total_shelf_life_days: float | None = None,
    profile: CategoryProfile | None = None,
) -> float:
    """Normalise remaining shelf life to 0-100.

    Expressed as a fraction of the product's expected total life so that "3 days
    left" scores very differently for seafood than for canned goods.
    """
    if remaining_days is None:
        return 50.0
    remaining = max(0.0, float(remaining_days))
    total = total_shelf_life_days or (profile.baseline_shelf_life_days if profile else 7.0)
    total = max(0.5, float(total))
    fraction = min(1.0, remaining / total)
    # Slight concavity: the last portion of life degrades quality faster.
    return clamp_score(100.0 * fraction**0.85)


def product_age_score(
    age_days: float | None,
    *,
    total_shelf_life_days: float | None = None,
    profile: CategoryProfile | None = None,
) -> float:
    """Normalise product age to 0-100 (younger == higher)."""
    if age_days is None:
        return 75.0  # unknown age: mildly optimistic but not a free pass
    age = max(0.0, float(age_days))
    total = total_shelf_life_days or (profile.baseline_shelf_life_days if profile else 7.0)
    total = max(0.5, float(total))
    consumed = min(1.6, age / total)
    return clamp_score(100.0 * max(0.0, 1.0 - consumed))


def storage_score_from_deviation(
    temperature_c: float | None,
    humidity_pct: float | None,
    *,
    profile: CategoryProfile,
    air_circulation: str | None = None,
    light_exposure: str | None = None,
) -> tuple[float, list[str]]:
    """Score the storage environment 0-100 and explain each deduction."""
    rule = profile.storage_rule
    penalties: list[str] = []
    score = 100.0

    if temperature_c is None:
        score -= 12.0
        penalties.append("temperature not recorded (-12)")
    else:
        temp = float(temperature_c)
        if temp > rule.temp_max_c:
            excess = temp - rule.temp_max_c
            # The cap scales with the category's temperature sensitivity, so a
            # catastrophic excursion can drive a highly perishable category's
            # storage score to zero, while barely moving a shelf-stable one.
            cap = 45.0 + rule.temp_sensitivity * 220.0
            penalty = min(cap, excess * (10.0 + rule.temp_sensitivity * 90.0))
            score -= penalty
            penalties.append(
                f"temperature {temp:.1f} C exceeds the {rule.temp_max_c:.0f} C maximum "
                f"by {excess:.1f} C (-{penalty:.0f})"
            )
        elif temp < rule.temp_min_c:
            deficit = rule.temp_min_c - temp
            penalty = min(28.0, deficit * 6.0)
            score -= penalty
            penalties.append(
                f"temperature {temp:.1f} C is {deficit:.1f} C below the "
                f"{rule.temp_min_c:.0f} C minimum (-{penalty:.0f})"
            )

    if humidity_pct is None:
        score -= 8.0
        penalties.append("humidity not recorded (-8)")
    else:
        humidity = float(humidity_pct)
        if humidity > rule.humidity_max_pct:
            excess = humidity - rule.humidity_max_pct
            penalty = min(28.0, excess * 0.85)
            score -= penalty
            penalties.append(
                f"humidity {humidity:.0f}% exceeds the {rule.humidity_max_pct:.0f}% "
                f"maximum (-{penalty:.0f})"
            )
        elif humidity < rule.humidity_min_pct:
            deficit = rule.humidity_min_pct - humidity
            penalty = min(24.0, deficit * 0.7)
            score -= penalty
            penalties.append(
                f"humidity {humidity:.0f}% is below the {rule.humidity_min_pct:.0f}% "
                f"minimum (-{penalty:.0f})"
            )

    if air_circulation and str(air_circulation).upper() == "POOR":
        score -= 8.0
        penalties.append("poor air circulation (-8)")

    if light_exposure:
        order = {"DARK": 0, "LOW": 1, "MODERATE": 2, "HIGH": 3}
        current = order.get(str(light_exposure).upper(), 1)
        allowed = order.get(str(rule.max_light_exposure).upper(), 1)
        if current > allowed:
            penalty = (current - allowed) * 5.0
            score -= penalty
            penalties.append(
                f"light exposure '{str(light_exposure).lower()}' exceeds the recommended "
                f"'{str(rule.max_light_exposure).lower()}' (-{penalty:.0f})"
            )

    if not penalties:
        penalties.append("all recorded storage parameters are inside the recommended envelope")

    return clamp_score(score), penalties


# ------------------------------------------------------------------- engine
def compute_freshness_score(
    *,
    visual_score: float | None,
    storage_score: float | None,
    shelf_life_score_value: float | None,
    product_age_score_value: float | None,
    weights: dict[str, float] | None = None,
    thresholds: dict[str, float] | None = None,
    explanation: list[str] | None = None,
) -> FreshnessScoreResult:
    """Combine the four normalised components into the final freshness score.

    All components are clamped to 0-100 first, so the result is always 0-100 and
    `visual=storage=shelf_life=age=100` yields exactly 100.
    """
    normalised_weights = normalise_weights(weights)
    limits = thresholds or settings.score_thresholds

    components = ScoreComponents(
        visual=clamp_score(visual_score),
        storage=clamp_score(storage_score),
        shelf_life=clamp_score(shelf_life_score_value),
        product_age=clamp_score(product_age_score_value),
    )

    contributions = {
        "visual": components.visual * normalised_weights["visual"],
        "storage": components.storage * normalised_weights["storage"],
        "shelf_life": components.shelf_life * normalised_weights["shelf_life"],
        "product_age": components.product_age * normalised_weights["product_age"],
    }
    score = clamp_score(sum(contributions.values()))
    category = score_to_category(score, limits)

    detail = list(explanation or [])
    detail.append(
        "Weighted model: "
        + " + ".join(
            f"{normalised_weights[key]:.0%} x {getattr(components, key):.0f}"
            for key in ("visual", "storage", "shelf_life", "product_age")
        )
        + f" = {score:.1f}/100 ({category})"
    )

    return FreshnessScoreResult(
        score=score,
        category=category,
        components=components,
        weights={k: round(v, 4) for k, v in normalised_weights.items()},
        contributions=contributions,
        thresholds=dict(limits),
        explanation=detail,
    )


def overall_health_score(
    freshness_score: float,
    *,
    spoilage_probability: float | None = None,
    compliance_penalty: float = 0.0,
) -> float:
    """A single 0-100 'food health' figure combining freshness and spoilage risk."""
    score = clamp_score(freshness_score)
    if spoilage_probability is not None:
        score -= min(40.0, float(spoilage_probability) * 45.0)
    score -= max(0.0, compliance_penalty)
    return clamp_score(score)


def quality_score(
    visual_score: float | None,
    storage_score: float | None,
    shelf_life_score_value: float | None,
    *,
    spoilage_probability: float | None = None,
) -> float:
    """A standalone 0-100 product-condition quality figure.

    Unlike the freshness score it deliberately excludes product age, so it
    answers "what condition is this food in right now" rather than "how much
    of its life is left"::

        Quality Score = 0.50 x Visual Score
                      + 0.30 x Storage Score
                      + 0.20 x Shelf-Life Score
                      - spoilage deduction (up to 40 pts)

    Components are clamped to 0-100 first, so the result is always 0-100.
    """
    score = (
        0.50 * clamp_score(visual_score)
        + 0.30 * clamp_score(storage_score)
        + 0.20 * clamp_score(shelf_life_score_value)
    )
    if spoilage_probability is not None:
        score -= min(40.0, float(spoilage_probability) * 45.0)
    return clamp_score(score)


def build_score_explanation(result: FreshnessScoreResult) -> dict[str, Any]:
    """Structure for the explainable-AI panel in the UI."""
    return {
        "final_score": round(result.score, 1),
        "final_category": str(result.category),
        "components": [
            {
                "key": key,
                "label": label,
                "score": round(getattr(result.components, key), 1),
                "weight": result.weights[key],
                "weight_label": f"{result.weights[key]:.0%}",
                "contribution": round(result.contributions[key], 2),
            }
            for key, label in (
                ("visual", "Visual Condition"),
                ("storage", "Storage Conditions"),
                ("shelf_life", "Shelf-Life Prediction"),
                ("product_age", "Product Age"),
            )
        ],
        "thresholds": result.thresholds,
        "notes": result.explanation,
        "disclaimer": (
            "This is an AI estimate produced from image features and recorded storage "
            "data. It is not a laboratory measurement and carries no guarantee of food "
            "safety."
        ),
    }
