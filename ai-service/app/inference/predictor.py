"""
Master Predictor Pipeline for AI Inference Service
"""
import uuid
import time
from typing import Dict, Any, Optional
from PIL import Image

from app.inference.preprocessing import load_and_preprocess_image
from app.inference.freshness_classifier import FreshnessClassifier
from app.inference.food_classifier import FoodClassifier
from app.inference.shelf_life_predictor import ShelfLifePredictor

class FreshnessPredictorPipeline:
    def __init__(self):
        self.freshness_classifier = FreshnessClassifier()
        self.food_classifier = FoodClassifier()
        self.shelf_life_predictor = ShelfLifePredictor()
        
    def initialize(self):
        """Loads models into memory once at service startup."""
        self.freshness_classifier.load_model()

    def predict(
        self,
        image_bytes: bytes,
        food_type: Optional[str] = None,
        category: Optional[str] = None,
        temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        packaging_type: Optional[str] = None,
        storage_duration: Optional[int] = 0
    ) -> Dict[str, Any]:
        """
        Full end-to-end inference execution:
        1. Preprocesses image
        2. Executes trained CNN inference
        3. Extracts probabilities & classifications
        4. Calculates visual condition score & metrics
        5. Computes rule-based storage & recommendation signals
        """
        start_time = time.perf_counter()
        
        # 1. Image Preprocessing
        preprocessed_tensor = load_and_preprocess_image(image_bytes)
        
        # 2. Freshness Classification
        model_result = self.freshness_classifier.predict(preprocessed_tensor)
        
        # 3. Food Type Resolution
        food_info = self.food_classifier.resolve_food_type(
            model_detected_type=model_result["detected_food_type"],
            user_provided_type=food_type
        )
        final_food_type = food_info["label"]
        final_category = category or food_info["category"]
        
        # 4. Probabilities & Visual Score
        fresh_prob = model_result["fresh_probability"]
        rotten_prob = model_result["rotten_probability"]
        predicted_label = model_result["predicted_label"]
        confidence = model_result["confidence"]
        
        # Visual Condition Score (0 to 100 based directly on fresh probability)
        visual_score = round(fresh_prob * 100, 1)
        
        # 5. Modular Shelf-Life Prediction
        shelf_life_info = self.shelf_life_predictor.predict(
            food_type=final_food_type,
            freshness_prob=fresh_prob,
            temperature=temperature,
            humidity=humidity,
            storage_duration_days=storage_duration or 0
        )
        
        # 6. Storage Assessment
        storage_score = 90.0
        storage_status = "normal"
        storage_issues = []
        if temperature is not None:
            if temperature > 12.0:
                storage_score -= 25.0
                storage_status = "warning"
                storage_issues.append(f"High storage temperature ({temperature}°C)")
            elif temperature < 0.0:
                storage_score -= 15.0
                storage_status = "warning"
                storage_issues.append(f"Sub-zero chilling risk ({temperature}°C)")
                
        if humidity is not None and humidity < 60.0:
            storage_score -= 10.0
            storage_issues.append(f"Low relative humidity ({humidity}%)")
            
        storage_score = max(0.0, min(100.0, storage_score))

        # 7. Composite Freshness Score: 40% Visual + 25% Storage + 20% Shelf-Life Factor + 15% Age
        # Shelf-life component: remaining / base
        base_sl = self.shelf_life_predictor.baseline_shelf_life.get(final_food_type.lower(), 10)
        sl_ratio = min(1.0, (shelf_life_info["remaining_days"] or 0) / base_sl)
        shelf_life_score = sl_ratio * 100.0
        
        age_score = max(0.0, 100.0 - (storage_duration or 0) * 10.0)
        
        composite_score = round(
            (visual_score * 0.40) +
            (storage_score * 0.25) +
            (shelf_life_score * 0.20) +
            (age_score * 0.15)
        )
        composite_score = max(0, min(100, composite_score))

        # Freshness Category Mapping
        if composite_score >= 85:
            freshness_category = "Fresh"
            risk_level = "Low"
            detected_issues = ["None"]
        elif composite_score >= 70:
            freshness_category = "Good"
            risk_level = "Low"
            detected_issues = ["Minor superficial oxidation"]
        elif composite_score >= 55:
            freshness_category = "Acceptable"
            risk_level = "Medium"
            detected_issues = ["Noticeable skin wrinkling", "Reduced turgidity"]
        elif composite_score >= 35:
            freshness_category = "Near Spoilage"
            risk_level = "High"
            detected_issues = ["Brown sugar spotting", "Peel breakdown", "Early microbial activity"]
        else:
            freshness_category = "Spoiled"
            risk_level = "Critical"
            detected_issues = ["Severe fungal breakdown", "Tissue liquefaction", "Spoilage pathogen activity"]

        # Recommendations
        recommendations = []
        if composite_score >= 70:
            recommendations.append(f"Maintain standard cold storage between 2°C and 4°C with controlled humidity.")
            recommendations.append("Continue standard FIFO inventory dispatch.")
        elif composite_score >= 50:
            recommendations.append("Prioritize for immediate culinary use or commercial processing.")
            recommendations.append("Inspect surrounding batch units for moisture condensation.")
        else:
            recommendations.append("Quarantine batch immediately to prevent cross-contamination.")
            recommendations.append("Declassify and divert to organics composting.")

        total_latency = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "analysis_id": f"ana-{uuid.uuid4().hex[:8]}",
            "food_type": {
                "label": final_food_type,
                "confidence": food_info["confidence"]
            },
            "category": final_category,
            "freshness": {
                "label": predicted_label,
                "confidence": confidence,
                "fresh_probability": fresh_prob,
                "rotten_probability": rotten_prob
            },
            "visual_score": visual_score,
            "spoilage_probability": rotten_prob,
            "shelf_life": shelf_life_info,
            "storage": {
                "temperature": temperature,
                "humidity": humidity,
                "status": storage_status,
                "score": storage_score,
                "issues": storage_issues
            },
            "freshness_score": composite_score,
            "freshness_category": freshness_category,
            "risk_level": risk_level,
            "detected_issues": detected_issues,
            "recommendations": recommendations,
            "inference_time_ms": total_latency
        }

predictor_pipeline = FreshnessPredictorPipeline()
