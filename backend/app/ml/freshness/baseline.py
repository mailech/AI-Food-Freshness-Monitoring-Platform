"""Baseline freshness classifier.

HONEST LABELLING
----------------
This is **not** a trained neural network. It is a deterministic, fully
inspectable scoring function over the colour and texture descriptors produced by
`app.ml.image_analysis`. Its output is always tagged `is_demo=True` and the UI
labels it "Demo / Baseline Analysis".

How it works
------------
1. A *visual condition score* (0-100) is formed from the colour-degradation and
   texture-condition sub-scores, weighted per food category (produce is judged
   more on colour, bakery more on texture).
2. Detected spoilage evidence applies bounded deductions.
3. The score is converted to a class via the configurable thresholds and to a
   soft probability distribution with a logistic kernel centred on each band, so
   the API can return calibratable `class_probabilities` instead of a hard label.
4. Confidence is reduced for blurry images, tiny food regions and scores that
   sit near a class boundary - i.e. the model says when it is unsure.

Replacing it
------------
Train a CNN or a scikit-learn classifier (`ml/training/train_freshness.py`),
drop the artefact in `backend/app/ml/models/` and set `DEMO_MODE=false`. The
registry will prefer the trained model automatically.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from app.config import settings
from app.core.category_rules import get_profile
from app.core.enums import FreshnessCategory, ModelKind, SpoilageIndicatorType
from app.ml.base import FreshnessModel, FreshnessPrediction, ModelInfo
from app.ml.image_analysis.color import color_degradation_score
from app.ml.image_analysis.texture import blur_confidence_factor, texture_condition_score

# Per-indicator visual deduction: (max points, points per unit confidence,
# points per unit affected area). Tuned so a clearly bruised apple lands in
# "Acceptable" rather than "Fresh", and a mouldy loaf lands in "Spoiled".
_INDICATOR_DEDUCTION: dict[str, tuple[float, float, float]] = {
    SpoilageIndicatorType.MOLD.value: (52.0, 46.0, 60.0),
    SpoilageIndicatorType.DISCOLORATION.value: (30.0, 24.0, 42.0),
    SpoilageIndicatorType.BRUISING.value: (26.0, 20.0, 46.0),
    SpoilageIndicatorType.SURFACE_DEGRADATION.value: (20.0, 20.0, 20.0),
    SpoilageIndicatorType.DRYNESS.value: (16.0, 14.0, 24.0),
    SpoilageIndicatorType.WETNESS.value: (16.0, 14.0, 24.0),
    SpoilageIndicatorType.PHYSICAL_DAMAGE.value: (12.0, 11.0, 18.0),
    SpoilageIndicatorType.TEXTURE_CHANGE.value: (14.0, 13.0, 16.0),
    SpoilageIndicatorType.COLOR_DEGRADATION.value: (18.0, 16.0, 22.0),
}

# Representative centre of each band, used to build the probability kernel.
_BAND_CENTRES: dict[FreshnessCategory, float] = {
    FreshnessCategory.FRESH: 95.0,
    FreshnessCategory.GOOD: 82.0,
    FreshnessCategory.ACCEPTABLE: 67.0,
    FreshnessCategory.NEAR_SPOILAGE: 45.0,
    FreshnessCategory.SPOILED: 14.0,
}

# Categories where colour carries more signal than texture, and vice versa.
_COLOR_WEIGHT_BY_CATEGORY: dict[str, float] = {
    "FRUITS": 0.66,
    "VEGETABLES": 0.64,
    "DAIRY": 0.58,
    "MEAT_POULTRY": 0.70,
    "SEAFOOD": 0.68,
    "BAKERY": 0.46,
    "PACKAGED": 0.50,
    "BEVERAGES": 0.60,
}


def score_to_category(score: float, thresholds: dict[str, float] | None = None) -> FreshnessCategory:
    """Map a 0-100 freshness score onto a freshness class."""
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


def score_to_probabilities(score: float, sharpness: float = 11.0) -> dict[str, float]:
    """Soft distribution over the five classes given a scalar score."""
    logits = {
        category: -abs(score - centre) / sharpness
        for category, centre in _BAND_CENTRES.items()
    }
    max_logit = max(logits.values())
    exp = {c: float(np.exp(v - max_logit)) for c, v in logits.items()}
    total = sum(exp.values()) or 1.0
    return {str(c): round(v / total, 4) for c, v in exp.items()}


def _boundary_margin(score: float) -> float:
    """Distance (0..1) from the nearest class boundary; small == uncertain."""
    limits = sorted(settings.score_thresholds.values())
    distances = [abs(score - limit) for limit in limits]
    nearest = min(distances) if distances else 20.0
    return float(np.clip(nearest / 12.0, 0.0, 1.0))


class BaselineFreshnessModel(FreshnessModel):
    """Deterministic CV-feature freshness estimator."""

    NAME = "baseline-cv-freshness"
    VERSION = "1.2.0"

    @property
    def info(self) -> ModelInfo:
        return ModelInfo(
            name=self.NAME,
            version=self.VERSION,
            kind=ModelKind.BASELINE,
            description=(
                "Deterministic rule-based classifier over OpenCV colour and texture "
                "descriptors. No training data, no learned weights - results are an "
                "explainable estimate, not a trained model prediction."
            ),
            is_demo=True,
            trained_on=None,
            metrics={},  # deliberately empty: no evaluation has been performed
        )

    def predict(
        self,
        features: dict[str, float],
        *,
        category_slug: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> FreshnessPrediction:
        profile = get_profile(category_slug)

        color_score = features.get("color_degradation_score") or color_degradation_score(features)
        texture_score = features.get("texture_condition_score") or texture_condition_score(features)

        color_weight = _COLOR_WEIGHT_BY_CATEGORY.get(profile.slug, 0.6)
        visual_score = color_weight * color_score + (1.0 - color_weight) * texture_score

        # ---- bounded deductions from explicit evidence -------------------
        # Each detected indicator applies its own capped deduction, so a single
        # decisive finding (heavy bruising, mould) visibly moves the score
        # instead of being averaged away.
        ctx = context or {}
        deductions: list[tuple[str, float]] = []
        spoilage_probability = float(ctx.get("spoilage_probability", 0.0) or 0.0)
        mold_confidence = float(ctx.get("mold_confidence", 0.0) or 0.0)
        indicators_ctx: list[dict[str, Any]] = list(ctx.get("indicators") or [])

        for item in indicators_ctx:
            indicator = str(item.get("indicator_type", ""))
            confidence = float(item.get("confidence", 0.0) or 0.0)
            area = float(item.get("affected_area_ratio", 0.0) or 0.0)
            rule = _INDICATOR_DEDUCTION.get(indicator)
            if rule is None or confidence <= 0.15:
                continue
            cap, per_confidence, per_area = rule
            penalty = min(cap, confidence * per_confidence + min(0.5, area) * per_area)
            if penalty >= 1.0:
                deductions.append((indicator.replace("_", " ").lower(), penalty))

        # Residual aggregate risk not already attributed to a named indicator.
        named_total = sum(p for _, p in deductions)
        if spoilage_probability > 0.3 and named_total < 12.0:
            deductions.append(
                ("aggregate spoilage evidence", min(18.0, (spoilage_probability - 0.3) * 30.0))
            )

        dark_ratio = features.get("dark_spot_ratio", 0.0)
        if dark_ratio > 0.1:
            deductions.append(("extensive dark/rot areas", min(15.0, (dark_ratio - 0.1) * 62.0)))

        # Total deduction is capped so the score never collapses on one signal
        # alone - except for mould, which is allowed to dominate.
        total_deduction = sum(penalty for _, penalty in deductions)
        cap = 92.0 if mold_confidence > 0.45 else 62.0
        if total_deduction > cap:
            scale = cap / total_deduction
            deductions = [(label, penalty * scale) for label, penalty in deductions]
            total_deduction = cap

        visual_score -= total_deduction
        visual_score = float(np.clip(visual_score, 0.0, 100.0))

        # ---- classify -----------------------------------------------------
        category = score_to_category(visual_score)
        probabilities = score_to_probabilities(visual_score)
        freshness_probability = probabilities[str(category)]

        # ---- confidence ---------------------------------------------------
        blur_factor = blur_confidence_factor(features)
        food_ratio = float(features.get("food_pixel_ratio", 0.5))
        # A very small or full-frame mask means segmentation was unhelpful.
        region_factor = float(np.clip(1.0 - abs(food_ratio - 0.55) * 0.85, 0.5, 1.0))
        margin_factor = 0.72 + 0.28 * _boundary_margin(visual_score)
        confidence = float(
            np.clip(0.88 * blur_factor * region_factor * margin_factor, 0.25, 0.95)
        )

        # ---- explanation indicators ---------------------------------------
        indicators: list[str] = []
        if features.get("browning_ratio", 0.0) < 0.04:
            indicators.append("Normal colour distribution")
        else:
            indicators.append(
                f"Colour shift toward brown/olive ({features['browning_ratio'] * 100:.1f}% of surface)"
            )
        if mold_confidence <= 0.2:
            indicators.append("No visible mould detected")
        else:
            indicators.append(f"Possible mould-like patches ({mold_confidence:.0%} confidence)")
        if texture_score >= 78:
            indicators.append("Low surface degradation")
        elif texture_score >= 60:
            indicators.append("Moderate surface texture change")
        else:
            indicators.append("Significant surface degradation")
        if dark_ratio > 0.08:
            indicators.append(f"Dark spots over {dark_ratio * 100:.1f}% of the surface")
        if features.get("pale_ratio", 0.0) > 0.15:
            indicators.append("Pale, possibly dehydrated surface")
        for label, penalty in deductions:
            indicators.append(f"Deduction applied for {label} (-{penalty:.0f} pts)")

        return FreshnessPrediction(
            freshness_category=category,
            freshness_probability=freshness_probability,
            confidence=confidence,
            visual_score=visual_score,
            detected_indicators=indicators,
            class_probabilities=probabilities,
            features={
                "color_degradation_score": round(color_score, 2),
                "texture_condition_score": round(texture_score, 2),
                "color_weight": color_weight,
                "blur_factor": round(blur_factor, 3),
                "region_factor": round(region_factor, 3),
                "boundary_margin_factor": round(margin_factor, 3),
            },
            model_info=self.info,
            notes=(
                "Baseline estimate derived from measurable colour and texture features. "
                "Install a trained model and set DEMO_MODE=false for learned predictions."
            ),
        )
