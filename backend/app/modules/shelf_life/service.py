import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

from app.modules.shelf_life.pipeline import (
    ShelfLifeInput,
    run_shelf_life_prediction_pipeline,
    EMPIRICAL_CATEGORY_BASELINES,
    PACKAGING_COEFFICIENTS
)

# Exposed constants for module compatibility
FOOD_CATEGORY_CONSTANTS = EMPIRICAL_CATEGORY_BASELINES
PACKAGING_MODIFIERS = PACKAGING_COEFFICIENTS

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
        return 20.0, 50.0

def predict_shelf_life_kinetics(
    category: str,
    packaging: str,
    temperature: float,
    humidity: float,
    storage_duration_days: float,
    visual_freshness_score: float = 100.0,
    air_circulation: str = "Medium",
    light_exposure: str = "Low",
    mold_detected: bool = False,
    bruising_detected: bool = False,
    damage_detected: bool = False
) -> Dict[str, Any]:
    """
    Service wrapper invoking the modular prediction pipeline.
    Fuses visual features, category baselines, packaging coefficients, climate metrics, and duration.
    """
    inp = ShelfLifeInput(
        category=category,
        packaging_type=packaging,
        temperature=temperature,
        humidity=humidity,
        air_circulation=air_circulation,
        light_exposure=light_exposure,
        storage_duration_days=storage_duration_days,
        visual_freshness_score=visual_freshness_score,
        mold_detected=mold_detected,
        bruising_detected=bruising_detected,
        damage_detected=damage_detected
    )

    pred_res = run_shelf_life_prediction_pipeline(inp)

    return {
        "predicted_remaining_shelf_life_days": pred_res.estimated_remaining_days,
        "predicted_expiry_date": pred_res.predicted_expiry_date,
        "recommended_temperature": pred_res.recommended_temperature,
        "recommended_humidity": pred_res.recommended_humidity,
        "risk_level": pred_res.risk_level,
        "impact_analysis": pred_res.impact_analysis,
        "status": pred_res.status,
        "methodology": pred_res.methodology,
        "estimated_remaining_days": pred_res.estimated_remaining_days,
        "estimated_expiry_date": pred_res.predicted_expiry_date,
        "confidence_score": pred_res.confidence_score,
        "factors_affecting_shelf_life": pred_res.factors_affecting_shelf_life,
        "model_version": pred_res.model_version,
        "prediction_timestamp": pred_res.prediction_timestamp,
        "input_summary": pred_res.input_summary
    }
