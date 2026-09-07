"""
Food Type Classifier & Normalizer
"""
from typing import Dict, Any, Optional

class FoodClassifier:
    def __init__(self):
        self.known_foods = {
            "apple": {"category": "Fruits", "base_score": 90},
            "banana": {"category": "Fruits", "base_score": 85},
            "orange": {"category": "Fruits", "base_score": 90},
            "strawberry": {"category": "Fruits", "base_score": 85},
            "tomato": {"category": "Vegetables", "base_score": 88},
            "potato": {"category": "Vegetables", "base_score": 95},
            "carrot": {"category": "Vegetables", "base_score": 92},
            "spinach": {"category": "Vegetables", "base_score": 85},
            "cucumber": {"category": "Vegetables", "base_score": 88},
            "milk": {"category": "Dairy Products", "base_score": 90},
            "cheese": {"category": "Dairy Products", "base_score": 90},
            "yogurt": {"category": "Dairy Products", "base_score": 88},
            "chicken": {"category": "Meat & Poultry", "base_score": 92},
            "fish": {"category": "Seafood", "base_score": 88},
            "bread": {"category": "Bakery Products", "base_score": 85}
        }

    def resolve_food_type(self, model_detected_type: Optional[str], user_provided_type: Optional[str]) -> Dict[str, Any]:
        """
        Harmonizes model-inferred food label with user-supplied food type.
        """
        chosen_type = (user_provided_type or model_detected_type or "apple").strip().lower()
        
        # Match against known dictionary
        profile = self.known_foods.get(chosen_type)
        if not profile:
            for key, val in self.known_foods.items():
                if key in chosen_type or chosen_type in key:
                    chosen_type = key
                    profile = val
                    break
                    
        category = profile["category"] if profile else "Packaged Foods"
        
        return {
            "label": chosen_type.capitalize(),
            "category": category,
            "confidence": 0.95 if model_detected_type and model_detected_type == chosen_type else 0.90
        }
