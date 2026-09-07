"""
Storage Rules & Scoring Service
Configurable optimal storage condition parameters for produce, dairy, meat, seafood, and bakery.
"""
from typing import Dict, Any, Tuple, Optional

STORAGE_PROFILES: Dict[str, Dict[str, Any]] = {
    "fruits": {
        "optimal_temp_range": (2.0, 6.0),
        "optimal_humidity_range": (80.0, 95.0),
        "ideal_airflow": "Moderate (1.0-1.4 m/s)",
        "light_tolerance": "Low (< 50 Lux)",
        "temp_weight": 0.6,
        "humidity_weight": 0.4
    },
    "vegetables": {
        "optimal_temp_range": (2.0, 8.0),
        "optimal_humidity_range": (85.0, 95.0),
        "ideal_airflow": "Moderate (0.8-1.2 m/s)",
        "light_tolerance": "Dark (< 20 Lux)",
        "temp_weight": 0.55,
        "humidity_weight": 0.45
    },
    "dairy products": {
        "optimal_temp_range": (1.0, 4.0),
        "optimal_humidity_range": (65.0, 75.0),
        "ideal_airflow": "Low-Moderate (0.6-1.0 m/s)",
        "light_tolerance": "Dark (< 10 Lux)",
        "temp_weight": 0.75,
        "humidity_weight": 0.25
    },
    "meat & poultry": {
        "optimal_temp_range": (0.0, 2.0),
        "optimal_humidity_range": (80.0, 90.0),
        "ideal_airflow": "High (1.5-2.0 m/s)",
        "light_tolerance": "Dark (< 5 Lux)",
        "temp_weight": 0.85,
        "humidity_weight": 0.15
    },
    "seafood": {
        "optimal_temp_range": (0.0, 1.5),
        "optimal_humidity_range": (85.0, 95.0),
        "ideal_airflow": "High (1.5-2.0 m/s)",
        "light_tolerance": "Dark (< 5 Lux)",
        "temp_weight": 0.90,
        "humidity_weight": 0.10
    },
    "bakery products": {
        "optimal_temp_range": (18.0, 22.0),
        "optimal_humidity_range": (45.0, 60.0),
        "ideal_airflow": "Gentle (0.4-0.8 m/s)",
        "light_tolerance": "Moderate (< 150 Lux)",
        "temp_weight": 0.5,
        "humidity_weight": 0.5
    },
    "packaged foods": {
        "optimal_temp_range": (15.0, 24.0),
        "optimal_humidity_range": (40.0, 65.0),
        "ideal_airflow": "Standard",
        "light_tolerance": "Ambient",
        "temp_weight": 0.5,
        "humidity_weight": 0.5
    }
}

class StorageRulesService:
    def get_profile_for_category(self, category: str) -> Dict[str, Any]:
        cat_key = category.strip().lower() if category else "packaged foods"
        return STORAGE_PROFILES.get(cat_key, STORAGE_PROFILES["packaged foods"])

    def calculate_storage_score(
        self,
        category: str,
        temperature: Optional[float],
        humidity: Optional[float]
    ) -> Tuple[float, str, list]:
        """
        Calculates a deterministic 0-100 storage quality score based on deviation from optimal thresholds.
        Returns (score, status, issues_list).
        """
        if temperature is None and humidity is None:
            return 90.0, "Normal", []

        profile = self.get_profile_for_category(category)
        min_temp, max_temp = profile["optimal_temp_range"]
        min_hum, max_hum = profile["optimal_humidity_range"]

        temp_penalty = 0.0
        hum_penalty = 0.0
        issues = []

        # Temperature evaluation
        if temperature is not None:
            if temperature < min_temp:
                diff = min_temp - temperature
                temp_penalty = min(50.0, diff * 12.0)
                issues.append(f"Temperature is {diff:.1f}°C below optimal minimum ({min_temp}°C). Risk of freeze injury.")
            elif temperature > max_temp:
                diff = temperature - max_temp
                temp_penalty = min(60.0, diff * 15.0)
                issues.append(f"Temperature is {diff:.1f}°C above optimal threshold ({max_temp}°C). Accelerates respiration/microbial growth.")

        # Humidity evaluation
        if humidity is not None:
            if humidity < min_hum:
                diff = min_hum - humidity
                hum_penalty = min(40.0, diff * 1.5)
                issues.append(f"Humidity is {diff:.0f}% below optimal range ({min_hum}-{max_hum}%). Risk of moisture loss/wilting.")
            elif humidity > max_hum:
                diff = humidity - max_hum
                hum_penalty = min(40.0, diff * 1.8)
                issues.append(f"Humidity is {diff:.0f}% above optimal range ({min_hum}-{max_hum}%). Condensation promotes mold growth.")

        storage_score = max(0.0, 100.0 - (temp_penalty * profile["temp_weight"] + hum_penalty * profile["humidity_weight"]))
        storage_score = round(storage_score, 1)

        if storage_score >= 80.0:
            status = "Normal"
        elif storage_score >= 50.0:
            status = "Warning"
        else:
            status = "Critical"

        return storage_score, status, issues

storage_rules_service = StorageRulesService()
