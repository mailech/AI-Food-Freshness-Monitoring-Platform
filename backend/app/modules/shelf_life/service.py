import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

FOOD_CATEGORY_CONSTANTS = {
    "Fruits": {
        "ideal_temp": 4.0,
        "ideal_humidity": 90.0,
        "base_shelf_life": 14.0,
        "temp_sensitivity": 1.08,  # theta (8% increase in decay rate per °C)
        "humidity_sensitivity": 1.02,  # phi (2% increase in decay rate per % RH deviation)
    },
    "Vegetables": {
        "ideal_temp": 4.0,
        "ideal_humidity": 95.0,
        "base_shelf_life": 10.0,
        "temp_sensitivity": 1.09,
        "humidity_sensitivity": 1.02,
    },
    "Dairy Products": {
        "ideal_temp": 3.0,
        "ideal_humidity": 50.0,
        "base_shelf_life": 7.0,
        "temp_sensitivity": 1.15,  # highly temperature sensitive
        "humidity_sensitivity": 1.01,
    },
    "Meat & Poultry": {
        "ideal_temp": 0.0,
        "ideal_humidity": 85.0,
        "base_shelf_life": 5.0,
        "temp_sensitivity": 1.18,
        "humidity_sensitivity": 1.02,
    },
    "Seafood": {
        "ideal_temp": -1.0,
        "ideal_humidity": 90.0,
        "base_shelf_life": 3.0,
        "temp_sensitivity": 1.22,
        "humidity_sensitivity": 1.02,
    },
    "Bakery Products": {
        "ideal_temp": 20.0,
        "ideal_humidity": 40.0,
        "base_shelf_life": 5.0,
        "temp_sensitivity": 1.05,
        "humidity_sensitivity": 1.08,  # very sensitive to mold in high humidity
    },
    "Packaged Foods": {
        "ideal_temp": 20.0,
        "ideal_humidity": 45.0,
        "base_shelf_life": 180.0,
        "temp_sensitivity": 1.02,
        "humidity_sensitivity": 1.01,
    },
    "Beverages": {
        "ideal_temp": 8.0,
        "ideal_humidity": 50.0,
        "base_shelf_life": 90.0,
        "temp_sensitivity": 1.03,
        "humidity_sensitivity": 1.00,
    },
}

PACKAGING_MODIFIERS = {
    "Vacuum Sealed": 2.5,
    "Modified Atmosphere Packaging (MAP)": 2.0,
    "Plastic Wrap": 1.2,
    "Plastic Jug": 1.1,
    "Cartboard Box": 1.0,
    "None": 1.0,
}

def get_environmental_defaults_by_location(location: Optional[str]) -> Tuple[float, float]:
    """
    Parse temperature and relative humidity defaults dynamically from location labels.
    """
    loc = (location or "").lower()
    if "freezer" in loc:
        return -18.0, 90.0
    elif "fridge" in loc or "cold" in loc or "refrigerat" in loc:
        return 4.0, 85.0
    elif "cooler" in loc:
        return 10.0, 80.0
    else:
        # Default ambient room temperature settings
        return 20.0, 50.0

def predict_shelf_life_kinetics(
    category: str,
    packaging: str,
    temperature: float,
    humidity: float,
    storage_duration_days: float,
    visual_freshness_score: float = 100.0
) -> Dict[str, Any]:
    """
    Run dynamic Arrhenius kinetic prediction calculation.
    Uses rule-based heuristic estimation mapping environmental telemetry to remaining shelf life.
    """
    from app.core.config import settings
    # Fetch constants with fruits as fallback
    category_constants = settings.FOOD_CATEGORY_CONSTANTS
    packaging_modifiers = settings.PACKAGING_MODIFIERS

    const = category_constants.get(category, category_constants["Fruits"])
    ideal_temp = const["ideal_temp"]
    ideal_humidity = const["ideal_humidity"]
    base_shelf_life = const["base_shelf_life"]
    temp_sensitivity = const["temp_sensitivity"]
    humidity_sensitivity = const["humidity_sensitivity"]

    # Base decay rate under ideal storage to lose 70 points (from 100 down to 30)
    k_base = 70.0 / base_shelf_life

    # Packaging extension multiplier
    pkg_mod = packaging_modifiers.get(packaging, 1.0)
    if not pkg_mod:
        pkg_mod = 1.0

    # Temperature kinetic acceleration factor
    temp_diff = temperature - ideal_temp
    # Decay accelerates for heat deviations, decreases for cooling deviations
    temp_factor = temp_sensitivity ** temp_diff

    # Humidity delta (non-optimal relative humidity drives faster decay)
    hum_diff = abs(humidity - ideal_humidity)
    hum_factor = humidity_sensitivity ** hum_diff

    # Combine factors to find effective daily decay rate
    k_effective = (k_base * temp_factor * hum_factor) / pkg_mod
    k_effective = max(0.1, k_effective)  # avoid division by zero or negative rates

    # Total predicted shelf-life under current conditions
    total_life_current = 70.0 / k_effective

    # Predicted remaining days
    starting_quality = min(100.0, max(30.0, visual_freshness_score))
    remaining_days = max(0.0, (starting_quality - 30.0) / k_effective)
    # Deduct duration already stored
    remaining_days = max(0.0, remaining_days - storage_duration_days)

    # Predicted total shelf life under ideal conditions
    total_life_ideal = base_shelf_life * pkg_mod

    # Build Impact explanations & factors affecting shelf life
    factors = []
    if abs(temp_diff) <= 1.0:
        temp_impact = "Optimal temperature maintenance. Deceleration: 0%."
    elif temp_diff > 0:
        temp_impact = f"Temperature is {temp_diff:.1f}°C above ideal ({ideal_temp}°C). Accelerates decay by {((temp_factor - 1.0) * 100):.1f}%."
        factors.append("Sub-optimal temperature (warmth acceleration)")
    else:
        temp_impact = f"Temperature is {abs(temp_diff):.1f}°C below ideal ({ideal_temp}°C). Slows decay rate."
        factors.append("Sub-optimal temperature (cooling deceleration)")

    if hum_diff <= 5.0:
        humidity_impact = "Optimal humidity levels."
    else:
        humidity_impact = f"Humidity is {hum_diff:.1f}% off from ideal ({ideal_humidity}%). Accelerates decay by {((hum_factor - 1.0) * 100):.1f}%."
        factors.append("Sub-optimal relative humidity level deviation")

    if packaging != "None" and pkg_mod > 1.0:
        factors.append(f"Protective packaging in use: {packaging}")

    # Determine risk level
    if remaining_days < 2.0:
        risk = "HIGH"
    elif remaining_days < 5.0:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    expiry_date = datetime.now(timezone.utc) + timedelta(days=remaining_days)

    return {
        # Configurable original API fields
        "predicted_remaining_shelf_life_days": round(remaining_days, 1),
        "predicted_expiry_date": expiry_date,
        "recommended_temperature": ideal_temp,
        "recommended_humidity": ideal_humidity,
        "risk_level": risk,
        "impact_analysis": {
            "temperature_impact": temp_impact,
            "humidity_impact": humidity_impact,
            "shelf_life_ideal_conditions_days": round(total_life_ideal, 1),
            "shelf_life_current_conditions_days": round(total_life_current, 1)
        },
        # Configurable new estimation/methodology audit fields
        "methodology": "Heuristic Arrhenius Kinetics Estimator (No trained ML model active)",
        "estimated_remaining_days": round(remaining_days, 1),
        "estimated_expiry_date": expiry_date,
        "confidence_score": 75.0,
        "factors_affecting_shelf_life": factors
    }
