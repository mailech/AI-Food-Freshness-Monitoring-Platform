"""Baseline shelf-life prediction.

HONEST LABELLING
----------------
This is a **transparent baseline**, not a model fitted to a validated dataset.
It is a documented kinetic approximation whose every factor is reported back to
the caller, so a reviewer can audit exactly how a number was produced. Output is
labelled "Baseline prediction" in the API and the UI.

Model
-----
    remaining_days = base_days
                     x temperature_factor
                     x humidity_factor
                     x packaging_factor
                     x freshness_factor
                     x circulation_factor
                     - storage_duration_days

`temperature_factor` follows the standard Q10 form used in food-quality
engineering: a rise of Q10_INTERVAL degrees above the ideal band roughly
multiplies the spoilage rate by Q10, i.e.

    rate_multiplier = Q10 ** (excess_degrees / Q10_INTERVAL)
    temperature_factor = 1 / rate_multiplier

Q10 is derived per category from `CategoryProfile.temp_sensitivity`, keeping the
constant configurable rather than hard-coded science.

Limitations (documented deliberately)
-------------------------------------
* No microbial growth model, no water-activity term, no pH term.
* Not validated against laboratory shelf-life studies.
* Should never be the sole basis of a food-safety decision.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from app.core.category_rules import get_profile, packaging_multiplier
from app.core.enums import ModelKind, RiskLevel
from app.ml.base import ModelInfo, ShelfLifeModel, ShelfLifePredictionResult

Q10_INTERVAL_C = 10.0
# Upper/lower bound of the reported interval as a fraction of the estimate.
INTERVAL_SPREAD = 0.35


def _temperature_factor(temp_c: float | None, profile) -> tuple[float, str]:
    rule = profile.storage_rule
    if temp_c is None:
        return 1.0, "no temperature recorded (assumed ideal)"

    if rule.temp_min_c <= temp_c <= rule.temp_max_c:
        return 1.0, f"temperature {temp_c:.1f} C is inside the {rule.temp_min_c:.0f}-{rule.temp_max_c:.0f} C band"

    if temp_c > rule.temp_max_c:
        excess = temp_c - rule.temp_max_c
        # temp_sensitivity ~0.02..0.22 maps to Q10 ~1.2..3.2
        q10 = 1.0 + rule.temp_sensitivity * 10.0
        factor = float(1.0 / (q10 ** (excess / Q10_INTERVAL_C)))
        return (
            float(np.clip(factor, 0.05, 1.0)),
            f"temperature {temp_c:.1f} C is {excess:.1f} C above the {rule.temp_max_c:.0f} C "
            f"maximum (Q10={q10:.1f})",
        )

    # Colder than recommended: usually beneficial, but freezing damages produce.
    deficit = rule.temp_min_c - temp_c
    if profile.slug in {"FRUITS", "VEGETABLES"} and temp_c < 0:
        return 0.7, f"temperature {temp_c:.1f} C risks chill/freeze damage for {profile.name.lower()}"
    factor = float(np.clip(1.0 + min(deficit, 6.0) * 0.03, 1.0, 1.2))
    return factor, f"temperature {temp_c:.1f} C is below the recommended minimum (slower spoilage)"


def _humidity_factor(humidity: float | None, profile) -> tuple[float, str]:
    rule = profile.storage_rule
    if humidity is None:
        return 1.0, "no humidity recorded (assumed ideal)"
    if rule.humidity_min_pct <= humidity <= rule.humidity_max_pct:
        return 1.0, f"humidity {humidity:.0f}% is inside the recommended band"

    if humidity > rule.humidity_max_pct:
        excess = humidity - rule.humidity_max_pct
        factor = float(np.clip(1.0 - excess * rule.humidity_sensitivity, 0.4, 1.0))
        return factor, f"humidity {humidity:.0f}% is {excess:.0f} points too high (mould risk)"

    deficit = rule.humidity_min_pct - humidity
    factor = float(np.clip(1.0 - deficit * rule.humidity_sensitivity * 0.8, 0.45, 1.0))
    return factor, f"humidity {humidity:.0f}% is {deficit:.0f} points too low (dehydration risk)"


def _freshness_factor(freshness_score: float | None) -> tuple[float, str]:
    """Current visible condition scales the remaining life."""
    if freshness_score is None:
        return 1.0, "no freshness assessment supplied"
    score = float(np.clip(freshness_score, 0.0, 100.0))
    # 100 -> 1.15, 75 -> 0.9, 50 -> 0.6, 25 -> 0.3, 0 -> 0.05
    factor = float(np.clip(0.05 + (score / 100.0) ** 1.35 * 1.12, 0.05, 1.15))
    return factor, f"freshness score {score:.0f}/100 scales remaining life by x{factor:.2f}"


def _circulation_factor(circulation: str | None) -> tuple[float, str]:
    mapping = {"POOR": 0.85, "MODERATE": 0.97, "GOOD": 1.03}
    if not circulation:
        return 1.0, "air circulation not recorded"
    factor = mapping.get(str(circulation).upper(), 1.0)
    return factor, f"{str(circulation).lower()} air circulation (x{factor:.2f})"


def _risk_level(remaining_days: float, perishability: float) -> RiskLevel:
    # More perishable products get a wider warning window.
    critical = 0.5 + perishability * 0.5
    high = 1.0 + perishability * 2.0
    medium = 3.0 + perishability * 4.0
    if remaining_days <= critical:
        return RiskLevel.CRITICAL
    if remaining_days <= high:
        return RiskLevel.HIGH
    if remaining_days <= medium:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


class BaselineShelfLifeModel(ShelfLifeModel):
    """Documented kinetic baseline for remaining shelf life."""

    NAME = "baseline-kinetic-shelf-life"
    VERSION = "1.1.0"

    @property
    def info(self) -> ModelInfo:
        return ModelInfo(
            name=self.NAME,
            version=self.VERSION,
            kind=ModelKind.BASELINE,
            description=(
                "Transparent Q10-style kinetic baseline combining category shelf life, "
                "temperature/humidity deviation, packaging and current freshness. Not "
                "fitted to a validated dataset - every factor is reported for audit."
            ),
            is_demo=True,
            metrics={},  # no evaluation performed: none claimed
        )

    def predict(self, features: dict[str, Any]) -> ShelfLifePredictionResult:
        category_slug = features.get("category_slug")
        profile = get_profile(category_slug)

        base_days = float(
            features.get("base_shelf_life_days") or profile.baseline_shelf_life_days
        )

        temp_factor, temp_reason = _temperature_factor(features.get("temperature_c"), profile)
        hum_factor, hum_reason = _humidity_factor(features.get("humidity_pct"), profile)
        pack_factor = packaging_multiplier(profile.slug, features.get("packaging_type"))
        fresh_factor, fresh_reason = _freshness_factor(features.get("freshness_score"))
        circ_factor, circ_reason = _circulation_factor(features.get("air_circulation"))

        total_life = base_days * temp_factor * hum_factor * pack_factor * fresh_factor * circ_factor
        elapsed = float(features.get("storage_duration_days") or 0.0)
        product_age = float(features.get("product_age_days") or elapsed)

        remaining = total_life - max(elapsed, 0.0)

        # A declared expiry date acts as a hard ceiling - never predict beyond it.
        declared_remaining = features.get("declared_remaining_days")
        capped_by_label = False
        if declared_remaining is not None:
            declared = float(declared_remaining)
            if remaining > declared:
                remaining = declared
                capped_by_label = True

        remaining = float(max(0.0, round(remaining, 2)))

        # ---- confidence -----------------------------------------------
        known_inputs = sum(
            1
            for key in ("temperature_c", "humidity_pct", "packaging_type", "freshness_score")
            if features.get(key) is not None
        )
        confidence = 0.42 + known_inputs * 0.09          # 0.42 .. 0.78
        if features.get("freshness_confidence") is not None:
            confidence = confidence * (0.7 + 0.3 * float(features["freshness_confidence"]))
        if product_age > total_life * 2:
            confidence *= 0.8  # far outside the modelled range
        confidence = float(np.clip(confidence, 0.25, 0.85))

        spread = INTERVAL_SPREAD * (1.0 + (1.0 - confidence))
        lower = float(max(0.0, remaining * (1.0 - spread)))
        upper = float(remaining * (1.0 + spread) + 0.5)

        risk = _risk_level(remaining, profile.perishability)

        reasons = [temp_reason, hum_reason, fresh_reason, circ_reason]
        if pack_factor != 1.0:
            reasons.append(
                f"{str(features.get('packaging_type') or 'packaging').lower()} packaging "
                f"multiplies shelf life by x{pack_factor:.2f}"
            )
        if elapsed > 0:
            reasons.append(f"{elapsed:.1f} day(s) already spent in storage")
        if capped_by_label:
            reasons.append("estimate capped by the declared best-before/expiry date")

        explanation = (
            f"Baseline prediction: {profile.name} starts from {base_days:.1f} days at ideal "
            f"storage. Applied factors -> " + "; ".join(reasons) + f". Estimated total life "
            f"{total_life:.1f} days, {remaining:.1f} day(s) remaining."
        )

        return ShelfLifePredictionResult(
            remaining_days=remaining,
            confidence=confidence,
            risk_level=risk,
            lower_bound_days=round(lower, 2),
            upper_bound_days=round(upper, 2),
            factors={
                "base_shelf_life_days": base_days,
                "temperature_factor": temp_factor,
                "humidity_factor": hum_factor,
                "packaging_factor": pack_factor,
                "freshness_factor": fresh_factor,
                "circulation_factor": circ_factor,
                "total_life_days": round(total_life, 2),
                "storage_duration_days": elapsed,
                "product_age_days": product_age,
            },
            features={k: v for k, v in features.items() if v is not None},
            explanation=explanation,
            model_info=self.info,
        )
