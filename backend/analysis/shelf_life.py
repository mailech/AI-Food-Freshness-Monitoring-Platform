import math
from analysis.food_info import get_food_info

def predict_shelf_life(food_name, freshness_score, storage_data=None):
    info = get_food_info(food_name)
    base_days = info["fresh_shelf_life_days"]

    freshness_factor = freshness_score / 100.0
    remaining = base_days * freshness_factor

    if storage_data:
        temp = storage_data.get("temperature", info["optimal_temp"])
        humidity = storage_data.get("humidity", info["optimal_humidity"])
        temp_diff = abs(temp - info["optimal_temp"])
        humidity_diff = abs(humidity - info["optimal_humidity"])

        temp_factor = math.exp(-0.05 * temp_diff)
        humidity_factor = math.exp(-0.02 * humidity_diff)

        packaging = storage_data.get("packaging_type", "Open")
        pack_factor = {"Sealed": 1.3, "Vacuum": 1.5, "Modified Atmosphere": 1.4, "Wrapped": 1.1, "Open": 0.9}.get(packaging, 1.0)

        remaining *= temp_factor * humidity_factor * pack_factor

    remaining = max(0, round(remaining, 1))

    if remaining <= 0:
        text = "Expired — consume immediately or discard"
        risk = "Critical"
    elif remaining <= 1:
        text = f"{remaining} day remaining — consume today"
        risk = "High"
    elif remaining <= 3:
        text = f"{remaining} days remaining — consume soon"
        risk = "Medium"
    else:
        text = f"{remaining} days remaining"
        risk = "Low"

    return {
        "remaining_days": remaining,
        "shelf_life_text": text,
        "risk_forecast": risk,
        "base_shelf_life_days": base_days,
        "optimal_storage": info["storage"],
        "recommended_packaging": info["packaging"],
        "factors": {
            "freshness_impact": round(freshness_factor, 2),
            "temperature_impact": round(storage_data.get("temperature", info["optimal_temp"]), 1) if storage_data else info["optimal_temp"],
            "humidity_impact": round(storage_data.get("humidity", info["optimal_humidity"]), 1) if storage_data else info["optimal_humidity"]
        }
    }
