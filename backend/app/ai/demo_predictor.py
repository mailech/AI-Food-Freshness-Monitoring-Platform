import random
import json

class DemoPredictor:
    def analyze_image(self, image_bytes: bytes, food_category: str = "General"):
        score = random.uniform(40.0, 98.0)
        
        if score > 85:
            category, spoilage_prob, indicators = "Fresh", random.uniform(0.01, 0.05), ["Vibrant color", "Firm texture"]
        elif score > 70:
            category, spoilage_prob, indicators = "Good", random.uniform(0.05, 0.15), ["Minor color variation"]
        elif score > 50:
            category, spoilage_prob, indicators = "Acceptable", random.uniform(0.15, 0.40), ["Slight wilting"]
        else:
            category, spoilage_prob, indicators = "Spoiled", random.uniform(0.70, 0.99), ["Mold detected", "Severe bruising"]

        return {
            "freshness_category": category,
            "freshness_score": round(score, 2),
            "spoilage_probability": round(spoilage_prob, 2),
            "confidence_score": round(random.uniform(0.75, 0.95), 2),
            "detected_indicators": json.dumps(indicators),
            "is_demo_prediction": True
        }