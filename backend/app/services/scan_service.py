from typing import Any, Dict, Optional, Union
import numpy as np
from PIL import Image

from app.ml.inference import predict_freshness
from app.ml.preprocessing import preprocess_image
from app.services.shelflife_service import calculate_shelf_life_days

FOOD_BASELINES = {
    "Apple": 14,
    "Banana": 5,
    "Orange": 14,
}


def analyze_food_scan(
    image_input: Union[bytes, np.ndarray, Image.Image],
    storage_temperature: Optional[float] = 4.0,
    humidity: Optional[float] = 85.0,
    selected_food: Optional[str] = None
) -> Dict[str, Any]:
    """Analyzes a food scan image using the pre-trained Food Freshness CNN model,

    integrating predictions with existing Fresh.OS shelf-life Q10 math and storage parameters.
    """
    temp = storage_temperature if storage_temperature is not None else 4.0
    hum = humidity if humidity is not None else 85.0

    # 1. CNN Vision Inference
    cnn_result = predict_freshness(image_input)
    predicted_food = cnn_result["food"]
    predicted_status = cnn_result["status"]
    confidence_pct = cnn_result["confidence"]
    confidence_score = cnn_result["confidence_score"]
    probabilities = cnn_result["probabilities"]
    predicted_class = cnn_result["predicted_class"]

    # Use user-selected food if valid CNN food (Apple, Banana, Orange), otherwise CNN prediction
    effective_food = predicted_food
    if selected_food and selected_food.strip().title() in ["Apple", "Banana", "Orange"]:
        effective_food = selected_food.strip().title()

    baseline_days = FOOD_BASELINES.get(effective_food, 10)

    # 2. Shelf life calculation via existing Q10 service
    # calculate_shelf_life_days adjusts baseline days using exponential temperature factor and humidity
    calculated_days = calculate_shelf_life_days(category=effective_food, temp=temp, humidity=hum)

    # 3. Integrate CNN result with Fresh.OS freshness score & status logic
    if predicted_status == "Rotten":
        freshness_score = max(10.0, min(38.0, round(35.0 - (confidence_score * 15.0), 1)))
        freshness_status = "Spoiled" if confidence_score >= 0.8 else "Near Spoilage"
        spoilage_risk = "High"
        remaining_days = 0
        storage_tip = (
            f"Rotten {effective_food} detected. High spoilage risk. "
            f"Isolate immediately to prevent decay transfer to neighboring produce."
        )
        consumption_suggestion = f"Unsafe for consumption. Compost or dispose of immediately."
    else:
        # Fresh prediction
        remaining_days = max(1, calculated_days)
        # Score blends CNN visual confidence (85-98) with storage temperature degradation
        temp_penalty = max(0.0, (temp - 4.0) * 1.5)
        hum_penalty = 5.0 if (hum < 70.0 or hum > 95.0) else 0.0
        score_val = 88.0 + (confidence_score * 10.0) - temp_penalty - hum_penalty
        freshness_score = max(65.0, min(99.0, round(score_val, 1)))

        if freshness_score >= 88.0:
            freshness_status = "Fresh"
            spoilage_risk = "Low"
        elif freshness_score >= 75.0:
            freshness_status = "Good"
            spoilage_risk = "Low"
        else:
            freshness_status = "Acceptable"
            spoilage_risk = "Medium"

        storage_tip = f"Maintain storage temperature at {temp}°C with ambient humidity around {hum}% RH."
        if temp > 8.0:
            storage_tip += f" Lowering to 4°C can extend shelf life by ~{max(1, round(remaining_days * 0.4))} days."
        consumption_suggestion = f"Safe for premium retail distribution and fresh consumption."

    # Compute storage conditions preservation score
    storage_score = max(30, min(100, round(100 - abs(temp - 4.0) * 5.0 - abs(hum - 85.0) * 0.5)))

    return {
        "prediction": {
            "food": effective_food,
            "status": predicted_status,
            "confidence": confidence_pct,
            "confidence_score": confidence_score,
            "predicted_class": predicted_class,
            "probabilities": probabilities,
        },
        "analysis": {
            "name": f"{predicted_status} {effective_food}",
            "food_type": effective_food,
            "category": effective_food,
            "freshness_score": freshness_score,
            "freshness_status": freshness_status,
            "spoilage_risk": spoilage_risk,
            "storage_temperature": temp,
            "humidity": hum,
            "storage_score": storage_score,
            "estimated_expiry_days": remaining_days,
            "baseline_days": baseline_days,
            "storage_tip": storage_tip,
            "consumption_suggestion": consumption_suggestion,
        }
    }
