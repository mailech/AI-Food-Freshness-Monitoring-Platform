"""Storage condition monitoring (SRS Module 6).

Validates readings against per-category ideal thresholds (FR-6.4) and
generates storage optimization recommendations (FR-6.5).
"""

from app.ml.shelf_life import IDEAL_STORAGE
from app.models.storage import StorageReading


def _fmt_range(lo: float, hi: float, unit: str) -> str:
    return f"{lo:g}–{hi:g}{unit}"


def evaluate_reading(
    category_name: str,
    reading: StorageReading,
) -> tuple[bool, list[str], list[str]]:
    """Return (compliant, violations, recommendations) for a reading."""
    violations: list[str] = []
    recommendations: list[str] = []
    ideal = IDEAL_STORAGE.get(category_name)

    if ideal is None:
        return True, [], []

    temp_lo, temp_hi, hum_lo, hum_hi = ideal

    if reading.temperature_c is not None:
        if reading.temperature_c < temp_lo:
            violations.append(
                f"Temperature {reading.temperature_c:g}°C below {_fmt_range(temp_lo, temp_hi, '°C')} for {category_name.lower()}"
            )
            recommendations.append(
                f"Warm storage to the {_fmt_range(temp_lo, temp_hi, '°C')} range to avoid chill/freezing injury."
            )
        elif reading.temperature_c > temp_hi:
            violations.append(
                f"Temperature {reading.temperature_c:g}°C above {_fmt_range(temp_lo, temp_hi, '°C')} for {category_name.lower()}"
            )
            recommendations.append(
                f"Cool storage to the {_fmt_range(temp_lo, temp_hi, '°C')} range; every degree above accelerates spoilage."
            )

    if reading.humidity_pct is not None:
        if reading.humidity_pct < hum_lo:
            violations.append(
                f"Humidity {reading.humidity_pct:g}% below {_fmt_range(hum_lo, hum_hi, '%')} for {category_name.lower()}"
            )
            recommendations.append("Increase humidity (e.g. crisper drawer or humidifier) to prevent drying out.")
        elif reading.humidity_pct > hum_hi:
            violations.append(
                f"Humidity {reading.humidity_pct:g}% above {_fmt_range(hum_lo, hum_hi, '%')} for {category_name.lower()}"
            )
            recommendations.append("Reduce humidity and check for condensation to limit mold growth.")

    if reading.light_exposure == "high":
        recommendations.append("Move item away from direct light to slow photo-degradation.")
    if reading.air_circulation == "low":
        recommendations.append("Improve air circulation around the item to avoid stagnant microclimates.")

    return not violations, violations, recommendations
