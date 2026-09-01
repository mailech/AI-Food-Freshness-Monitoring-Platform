"""
AI / ML Service Layer for Food Freshness Analysis.
Designed with clean modular interfaces so that real TensorFlow / PyTorch / YOLO models
can easily replace the simulated inference engine.
"""

import random
import hashlib
from typing import Dict, Any, List

class FoodAIService:
    def __init__(self):
        # Realistic category heuristics and base shelf-life baselines
        self.food_profiles = {
            "apple": {
                "category": "Fruits",
                "base_shelf_life": 14,
                "optimal_temp": 4.0,
                "optimal_humidity": 90.0,
                "typical_issues": ["Minor surface bruising", "Light oxidation near stem", "Flesh softening"],
                "recommendation": "Store in a cool refrigerated environment with high humidity."
            },
            "banana": {
                "category": "Fruits",
                "base_shelf_life": 7,
                "optimal_temp": 13.0,
                "optimal_humidity": 85.0,
                "typical_issues": ["Brown sugar spots", "Peel breakdown", "Stem degradation"],
                "recommendation": "Keep at room temperature away from direct sunlight and other fruits."
            },
            "strawberry": {
                "category": "Fruits",
                "base_shelf_life": 5,
                "optimal_temp": 2.0,
                "optimal_humidity": 95.0,
                "typical_issues": ["Moisture softness", "Mold spore risk", "Color dulling"],
                "recommendation": "Refrigerate unwashed in a single layer lined with paper towel."
            },
            "orange": {
                "category": "Fruits",
                "base_shelf_life": 18,
                "optimal_temp": 6.0,
                "optimal_humidity": 85.0,
                "typical_issues": ["Rind hardening", "Soft spots"],
                "recommendation": "Store in crisper drawer in mesh bag for airflow."
            },
            "tomato": {
                "category": "Vegetables",
                "base_shelf_life": 8,
                "optimal_temp": 12.0,
                "optimal_humidity": 80.0,
                "typical_issues": ["Skin wrinkling", "Stem loss", "Soft pulp"],
                "recommendation": "Store stem-side down at cool room temperature; avoid over-chilling."
            },
            "potato": {
                "category": "Vegetables",
                "base_shelf_life": 28,
                "optimal_temp": 9.0,
                "optimal_humidity": 85.0,
                "typical_issues": ["Early eye sprouting", "Surface greening"],
                "recommendation": "Store in a cool, dark, well-ventilated dry pantry."
            },
            "carrot": {
                "category": "Vegetables",
                "base_shelf_life": 21,
                "optimal_temp": 3.0,
                "optimal_humidity": 95.0,
                "typical_issues": ["Surface drying", "Flexibility loss"],
                "recommendation": "Remove greens and store in airtight container with a damp cloth in fridge."
            },
            "spinach": {
                "category": "Vegetables",
                "base_shelf_life": 6,
                "optimal_temp": 2.0,
                "optimal_humidity": 95.0,
                "typical_issues": ["Leaf yellowing", "Moisture wilting", "Stem dampness"],
                "recommendation": "Keep in airtight sealed bag with paper towel in vegetable crisper."
            },
            "cucumber": {
                "category": "Vegetables",
                "base_shelf_life": 9,
                "optimal_temp": 10.0,
                "optimal_humidity": 85.0,
                "typical_issues": ["Soft tips", "Skin pitting"],
                "recommendation": "Wrap individually in paper towel and place in refrigerator upper shelf."
            },
            "milk": {
                "category": "Dairy Products",
                "base_shelf_life": 10,
                "optimal_temp": 3.0,
                "optimal_humidity": 70.0,
                "typical_issues": ["Acidity increase", "Fat separation"],
                "recommendation": "Store on interior refrigerator shelf (not door) below 4°C."
            },
            "cheese": {
                "category": "Dairy Products",
                "base_shelf_life": 25,
                "optimal_temp": 4.0,
                "optimal_humidity": 80.0,
                "typical_issues": ["Surface mold", "Oil sweating", "Rind drying"],
                "recommendation": "Wrap in wax or parchment paper, then loose plastic wrap in cheese drawer."
            },
            "yogurt": {
                "category": "Dairy Products",
                "base_shelf_life": 14,
                "optimal_temp": 3.0,
                "optimal_humidity": 70.0,
                "typical_issues": ["Whey separation", "Sour odor buildup"],
                "recommendation": "Keep sealed tightly in coldest section of the refrigerator."
            },
            "chicken": {
                "category": "Meat & Poultry",
                "base_shelf_life": 4,
                "optimal_temp": 1.0,
                "optimal_humidity": 85.0,
                "typical_issues": ["Surface sliminess", "Odor shift", "Color greying"],
                "recommendation": "Store at 0-2°C on bottom shelf in sealed container or freeze immediately."
            },
            "fish": {
                "category": "Seafood",
                "base_shelf_life": 3,
                "optimal_temp": 0.5,
                "optimal_humidity": 90.0,
                "typical_issues": ["Cloudy eyes", "Gill discoloration", "Ammonia odor"],
                "recommendation": "Pack on crushed ice in refrigerator and consume within 24-48 hours."
            },
            "bread": {
                "category": "Bakery Products",
                "base_shelf_life": 6,
                "optimal_temp": 20.0,
                "optimal_humidity": 55.0,
                "typical_issues": ["Staling / crumb hardening", "Surface mold spots"],
                "recommendation": "Store in bread box at room temperature; freeze sliced portions for longer storage."
            }
        }

    def analyze_food(self, food_type: str = "Apple", category: str = "Fruits", image_bytes: bytes = None) -> Dict[str, Any]:
        """
        Simulates Computer Vision & Spectroscopy AI Pipeline.
        This function mimics YOLO object detection + ResNet freshness classification + degradation regression.
        """
        normalized_name = food_type.strip().lower() if food_type else "apple"
        
        # Match or fallback
        profile = self.food_profiles.get(normalized_name)
        if not profile:
            # check substring
            for key, prof in self.food_profiles.items():
                if key in normalized_name or normalized_name in key:
                    profile = prof
                    break
        
        if not profile:
            profile = {
                "category": category or "Packaged Foods",
                "base_shelf_life": 10,
                "optimal_temp": 4.0,
                "optimal_humidity": 75.0,
                "typical_issues": ["Minor surface oxidation"],
                "recommendation": "Maintain controlled temperature and inspect batch packaging."
            }

        # Deterministic variation if image bytes are provided, otherwise pleasant high-confidence demo numbers
        seed = 42
        if image_bytes:
            seed = int(hashlib.md5(image_bytes[:500]).hexdigest(), 16) % 100
        else:
            seed = random.randint(10, 95)

        # Generate realistic demo distributions based on seed
        # 70% chance of Fresh/Good, 20% Acceptable/Near Spoilage, 10% Spoiled
        if seed > 35:
            freshness_score = min(98, 82 + (seed % 17))
            freshness_category = "Fresh"
            spoilage_prob = round(0.02 + (seed % 8) * 0.01, 2)
            shelf_life_days = max(3, int(profile["base_shelf_life"] * (freshness_score / 100)))
            detected_issues = []
            risk_level = "Low"
        elif seed > 15:
            freshness_score = 68 + (seed % 14)
            freshness_category = "Good" if freshness_score > 75 else "Acceptable"
            spoilage_prob = round(0.12 + (seed % 10) * 0.02, 2)
            shelf_life_days = max(2, int(profile["base_shelf_life"] * 0.45))
            detected_issues = [profile["typical_issues"][0]] if profile["typical_issues"] else ["Mild surface wear"]
            risk_level = "Medium"
        elif seed > 5:
            freshness_score = 48 + (seed % 18)
            freshness_category = "Near Spoilage"
            spoilage_prob = round(0.48 + (seed % 15) * 0.02, 2)
            shelf_life_days = 1
            detected_issues = profile["typical_issues"][:2] if len(profile["typical_issues"]) >= 2 else ["Discoloration", "Early decomposition"]
            risk_level = "High"
        else:
            freshness_score = 22 + (seed % 20)
            freshness_category = "Spoiled"
            spoilage_prob = round(0.85 + (seed % 10) * 0.01, 2)
            shelf_life_days = 0
            detected_issues = profile["typical_issues"] if profile["typical_issues"] else ["Severe fungal growth", "Decomposition odor"]
            risk_level = "Critical"

        confidence = round(0.88 + (random.randint(0, 10) * 0.01), 2)

        return {
            "food_type": food_type.capitalize() if food_type else "Apple",
            "category": profile["category"],
            "freshness_score": freshness_score,
            "freshness_category": freshness_category,
            "spoilage_probability": spoilage_prob,
            "estimated_shelf_life_days": shelf_life_days,
            "confidence": confidence,
            "detected_issues": detected_issues if detected_issues else ["None"],
            "recommendation": profile["recommendation"],
            "storage_recommendation": f"Keep refrigerated between {profile['optimal_temp'] - 2:.1f}°C and {profile['optimal_temp'] + 2:.1f}°C with {profile['optimal_humidity']:.0f}% RH.",
            "consumption_recommendation": f"Best consumed within {shelf_life_days} day{'s' if shelf_life_days != 1 else ''} for optimal nutritional quality." if shelf_life_days > 0 else "Do not consume. Product has exceeded safe threshold.",
            "waste_reduction_recommendation": "Prioritize this batch for front-row distribution in retail/pantry rotation." if shelf_life_days <= 3 else "Standard FIFO rotation protocol recommended.",
            "risk_level": risk_level,
            "metrics": {
                "chlorophyll_index": round(0.72 + (freshness_score / 400), 2),
                "surface_defect_ratio": f"{(100 - freshness_score) * 0.15:.1f}%",
                "ethylene_emission_est": "Low" if freshness_score > 70 else ("Moderate" if freshness_score > 50 else "High"),
                "color_uniformity": f"{min(99, freshness_score + 5)}%"
            }
        }

ai_service = FoodAIService()
