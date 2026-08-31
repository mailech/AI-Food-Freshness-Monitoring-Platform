"""Shelf-life prediction (SRS Module 5).

Heuristic model combining:
  - per-category base shelf life
  - visual freshness score from the CNN assessment (Module 3/4)
  - packaging type multiplier
  - storage temperature / humidity impact (FR-5.3)

Outputs remaining shelf life with a confidence interval and an early
spoilage risk rating (FR-5.2 / FR-5.4).
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

# Typical refrigerated shelf life (days) once the product is in stock,
# used as the starting point before condition adjustments.
BASE_SHELF_LIFE_DAYS = {
    "Fruits": 7,
    "Vegetables": 7,
    "Dairy": 14,
    "Meat & Poultry": 5,
    "Seafood": 3,
    "Bakery": 4,
    "Packaged Foods": 180,
    "Beverages": 90,
}
DEFAULT_BASE_DAYS = 7

# Ideal storage range per category: (min_temp_c, max_temp_c, min_hum, max_hum)
IDEAL_STORAGE = {
    "Fruits": (2, 8, 80, 95),
    "Vegetables": (2, 8, 85, 98),
    "Dairy": (1, 4, 50, 70),
    "Meat & Poultry": (-1, 4, 75, 90),
    "Seafood": (-1, 2, 75, 90),
    "Bakery": (15, 25, 40, 60),
    "Packaged Foods": (10, 25, 30, 60),
    "Beverages": (5, 25, 30, 70),
}

SEALED_PACKAGING = {"vacuum", "sealed", "canned", "airtight", "unopened"}
OPEN_PACKAGING = {"open", "opened", "unsealed", "unwrapped"}

CONFIDENCE_INTERVAL_RATIO = 0.18


@dataclass
class ShelfLifePrediction:
    base_shelf_life_days: int
    predicted_total_days: float
    remaining_days: int
    forecast_expiry_date: date
    expiry_low: date
    expiry_high: date
    confidence_interval_days: int
    early_spoilage_likelihood: str
    storage_impact_factor: float
    notes: list[str]

    def as_dict(self) -> dict:
        return {
            "base_shelf_life_days": self.base_shelf_life_days,
            "predicted_total_days": round(self.predicted_total_days, 1),
            "remaining_days": self.remaining_days,
            "forecast_expiry_date": self.forecast_expiry_date.isoformat(),
            "expiry_low": self.expiry_low.isoformat(),
            "expiry_high": self.expiry_high.isoformat(),
            "confidence_interval_days": self.confidence_interval_days,
            "early_spoilage_likelihood": self.early_spoilage_likelihood,
            "storage_impact_factor": round(self.storage_impact_factor, 2),
            "notes": self.notes,
        }


def _packaging_multiplier(packaging_type: str | None) -> tuple[float, list[str]]:
    if not packaging_type:
        return 1.0, []
    value = packaging_type.lower()
    if any(token in value for token in SEALED_PACKAGING):
        return 1.25, ["Sealed packaging extends shelf life."]
    if any(token in value for token in OPEN_PACKAGING):
        return 0.85, ["Opened packaging shortens shelf life."]
    return 1.0, []


def _storage_multiplier(
    category: str,
    temperature_c: float | None,
    humidity_pct: float | None,
) -> tuple[float, list[str]]:
    notes: list[str] = []
    factor = 1.0
    ideal = IDEAL_STORAGE.get(category)

    if temperature_c is not None and ideal is not None:
        lo, hi = ideal[0], ideal[1]
        if temperature_c < lo:
            penalty = min(0.3, (lo - temperature_c) * 0.04)
            factor -= penalty
            notes.append(f"Temperature {temperature_c}°C is below the ideal {lo}–{hi}°C range (freezing/chill injury risk).")
        elif temperature_c > hi:
            penalty = min(0.6, (temperature_c - hi) * 0.06)
            factor -= penalty
            notes.append(f"Temperature {temperature_c}°C exceeds the ideal {lo}–{hi}°C range, accelerating spoilage.")

    if humidity_pct is not None and ideal is not None:
        lo, hi = ideal[2], ideal[3]
        if humidity_pct < lo:
            factor -= min(0.2, (lo - humidity_pct) * 0.005)
            notes.append(f"Humidity {humidity_pct}% is below the ideal {lo}–{hi}% range (drying out).")
        elif humidity_pct > hi:
            factor -= min(0.3, (humidity_pct - hi) * 0.01)
            notes.append(f"Humidity {humidity_pct}% exceeds the ideal {lo}–{hi}% range (mold/moisture risk).")

    return max(0.2, factor), notes


def _risk_rating(freshness_score: float | None, remaining_ratio: float) -> str:
    score_component = (freshness_score / 100) if freshness_score is not None else 0.7
    combined = (score_component + min(remaining_ratio, 1.0)) / 2
    if combined >= 0.65:
        return "low"
    if combined >= 0.4:
        return "medium"
    return "high"


def predict_shelf_life(
    category_name: str,
    *,
    freshness_score: float | None,
    assessed_at: datetime | None,
    packaging_type: str | None = None,
    temperature_c: float | None = None,
    humidity_pct: float | None = None,
) -> ShelfLifePrediction:
    notes: list[str] = []

    base = BASE_SHELF_LIFE_DAYS.get(category_name, DEFAULT_BASE_DAYS)
    if category_name not in BASE_SHELF_LIFE_DAYS:
        notes.append(f"Unknown category '{category_name}'; using default base of {base} days.")

    pkg_mult, pkg_notes = _packaging_multiplier(packaging_type)
    notes.extend(pkg_notes)

    env_mult, env_notes = _storage_multiplier(category_name, temperature_c, humidity_pct)
    notes.extend(env_notes)

    fresh_ratio = (
        max(0.05, min(1.0, freshness_score / 100))
        if freshness_score is not None
        else 0.8
    )
    if freshness_score is None:
        notes.append("No image assessment yet; assuming average visual freshness (80).")

    total_days = base * fresh_ratio * pkg_mult * env_mult

    anchor = assessed_at or datetime.now(timezone.utc)
    if anchor.tzinfo is None:
        anchor = anchor.replace(tzinfo=timezone.utc)
    elapsed_days = max(0, (datetime.now(timezone.utc) - anchor).days)

    remaining = max(0, total_days - elapsed_days)
    today = date.today()
    ci_days = max(1, round(total_days * CONFIDENCE_INTERVAL_RATIO))

    return ShelfLifePrediction(
        base_shelf_life_days=base,
        predicted_total_days=total_days,
        remaining_days=round(remaining),
        forecast_expiry_date=today + timedelta(days=round(remaining)),
        expiry_low=today + timedelta(days=max(0, round(remaining) - ci_days)),
        expiry_high=today + timedelta(days=round(remaining) + ci_days),
        confidence_interval_days=ci_days,
        early_spoilage_likelihood=_risk_rating(freshness_score, remaining / base if base else 0),
        storage_impact_factor=pkg_mult * env_mult,
        notes=notes,
    )
