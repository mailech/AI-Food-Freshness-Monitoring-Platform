"""
Modular Shelf-Life Predictor Interface
"""
from typing import Dict, Any, Optional

class ShelfLifePredictor:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.is_ml_model_loaded = False
        # Baseline baseline shelf-lives in standard optimal conditions (in days)
        self.baseline_shelf_life = {
            "apple": 14,
            "banana": 7,
            "orange": 18,
            "strawberry": 5,
            "tomato": 8,
            "potato": 28,
            "carrot": 21,
            "spinach": 6,
            "cucumber": 9,
            "milk": 10,
            "cheese": 25,
            "yogurt": 14,
            "chicken": 4,
            "fish": 3,
            "bread": 6
        }

    def predict(
        self,
        food_type: str,
        freshness_prob: float,
        temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        storage_duration_days: int = 0
    ) -> Dict[str, Any]:
        """
        Calculates remaining shelf life using calibrated baseline heuristics
        while clearly reporting that a specialized time-series ML model is pending a temporal dataset.
        """
        normalized_food = food_type.strip().lower() if food_type else "apple"
        base_days = self.baseline_shelf_life.get(normalized_food, 10)
        
        # If freshness indicates spoiled / rotten (< 0.35) -> 0 remaining days
        if freshness_prob < 0.35:
            remaining_days = 0
            status = "expired_or_spoiled"
        elif freshness_prob < 0.60:
            remaining_days = max(1, int(base_days * 0.25))
            status = "near_expiration"
        else:
            # Scaled by freshness confidence and storage temperature impact
            temp_factor = 1.0
            if temperature is not None:
                if temperature > 10.0:
                    temp_factor = 0.7
                elif temperature < 5.0:
                    temp_factor = 1.1
            remaining_days = max(1, int(base_days * freshness_prob * temp_factor) - storage_duration_days)

        return {
            "remaining_days": remaining_days,
            "confidence": 0.90 if self.is_ml_model_loaded else None,
            "status": "ml_model_active" if self.is_ml_model_loaded else "model_not_available",
            "note": "Shelf-life model requires temporal deterioration dataset with ground-truth remaining days."
        }
