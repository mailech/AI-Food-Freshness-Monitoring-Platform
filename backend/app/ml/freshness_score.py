"""Weighted freshness scoring engine (SRS Module 7).

Freshness Score = Visual Condition Analysis (40%)
               + Storage Conditions        (25%)
               + Shelf-Life Prediction     (20%)
               + Product Age               (15%)

Produces component sub-scores (FR-7.2), the overall food health
score and a confidence rating (FR-7.3).
"""

from dataclasses import dataclass, field

WEIGHTS = {
    "visual": 0.40,
    "storage": 0.25,
    "shelf_life": 0.20,
    "age": 0.15,
}

DEFAULT_VISUAL_SCORE = 80.0
DEFAULT_STORAGE_SCORE = 70.0


@dataclass
class ScoreComponents:
    visual: float
    storage: float
    shelf_life: float
    age: float


@dataclass
class CompositeScore:
    overall_score: float
    health_category: str
    confidence: float
    components: ScoreComponents
    weights: dict = field(default_factory=lambda: dict(WEIGHTS))
    notes: list[str] = field(default_factory=list)


def _band(score: float) -> str:
    if score >= 85:
        return "Fresh"
    if score >= 70:
        return "Good"
    if score >= 55:
        return "Acceptable"
    if score >= 40:
        return "Near Spoilage"
    return "Spoiled"


def storage_subscore(
    *,
    temperature_violation: bool,
    humidity_violation: bool,
    light_exposure: str | None,
    air_circulation: str | None,
) -> tuple[float, list[str]]:
    """Derive a 0–100 storage score from evaluated reading flags."""
    notes: list[str] = []
    score = 100.0
    if temperature_violation:
        score -= 30
        notes.append("Temperature out of ideal range (-30).")
    if humidity_violation:
        score -= 25
        notes.append("Humidity out of ideal range (-25).")
    if light_exposure == "high":
        score -= 15
        notes.append("High light exposure (-15).")
    if air_circulation == "low":
        score -= 10
        notes.append("Poor air circulation (-10).")
    return max(0.0, score), notes


def compute_composite_score(
    *,
    visual_score: float | None,
    cnn_confidence: float | None,
    storage_score: float | None,
    remaining_ratio: float | None,
    age_ratio: float | None,
) -> CompositeScore:
    """Combine sub-scores using fixed SRS weights.

    visual_score:      CNN freshness score 0–100 (None -> neutral default)
    cnn_confidence:    model probability of predicted class 0–1
    storage_score:     0–100 from storage condition evaluation
    remaining_ratio:   remaining shelf life / base shelf life, 0..1+
    age_ratio:         product age / base shelf life, 0..1+
    """
    notes: list[str] = []

    visual = float(visual_score) if visual_score is not None else DEFAULT_VISUAL_SCORE
    if visual_score is None:
        notes.append("No image assessment; visual component defaulted to 80.")

    storage = float(storage_score) if storage_score is not None else DEFAULT_STORAGE_SCORE
    if storage_score is None:
        notes.append("No storage readings; storage component defaulted to 70.")

    shelf_life = max(0.0, min(1.0, remaining_ratio)) * 100 if remaining_ratio is not None else 60.0
    if remaining_ratio is None:
        notes.append("Shelf-life estimate unavailable; shelf-life component defaulted to 60.")

    age = max(0.0, (1.0 - min(age_ratio, 1.0))) * 100 if age_ratio is not None else 60.0
    if age_ratio is None:
        notes.append("Product age unknown; age component defaulted to 60.")

    components = ScoreComponents(
        visual=round(visual, 1),
        storage=round(storage, 1),
        shelf_life=round(shelf_life, 1),
        age=round(age, 1),
    )
    overall = (
        components.visual * WEIGHTS["visual"]
        + components.storage * WEIGHTS["storage"]
        + components.shelf_life * WEIGHTS["shelf_life"]
        + components.age * WEIGHTS["age"]
    )

    # Confidence reflects input completeness and model certainty.
    coverage = (
        (WEIGHTS["visual"] if visual_score is not None else 0.0)
        + (WEIGHTS["storage"] if storage_score is not None else 0.0)
        + (WEIGHTS["shelf_life"] if remaining_ratio is not None else 0.0)
        + (WEIGHTS["age"] if age_ratio is not None else 0.0)
    )
    model_certainty = cnn_confidence if cnn_confidence is not None else 0.5
    confidence = round((0.7 * coverage + 0.3 * model_certainty) * 100, 1)

    return CompositeScore(
        overall_score=round(overall, 1),
        health_category=_band(overall),
        confidence=confidence,
        components=components,
        notes=notes,
    )
