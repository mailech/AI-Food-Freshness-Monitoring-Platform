import os
from typing import Dict, Any, Optional
from app.core.config import settings
from ml.preprocessing import extract_features
from ml.inference import FreshnessMLInference, ModelUnavailableError
from ml.postprocessing import postprocess_prediction

class FoodFreshnessModel:
    """
    Real AI/ML pipeline executing image preprocessing, feature extraction,
    NumPy neural network classification inference, and business logic scoring.
    """
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.MODEL_PATH
        self.inference_engine = FreshnessMLInference(self.model_path)
        self.is_loaded = False
        try:
            self.load_model()
        except ModelUnavailableError:
            # We don't crash on init, but we check/raise on actual calls
            pass

    def load_model(self) -> None:
        self.inference_engine.load_model()
        self.is_loaded = True

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Executes preprocessing, neural network inference, and applies business rules.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Target image path '{image_path}' not found.")

        if not self.is_loaded:
            try:
                self.load_model()
            except Exception:
                raise ModelUnavailableError("AI model is currently unavailable.")

        # 1. Preprocessing & Feature Extraction (Pillow/OpenCV)
        features = extract_features(image_path)
        
        # 2. AI Model Inference (NumPy MLP forward pass)
        probs = self.inference_engine.predict(features)
        
        # 3. Postprocessing & Confidence Threshold Check
        post_results = postprocess_prediction(probs, settings.MODEL_CONFIDENCE_THRESHOLD)
        
        browning_idx = float(features[3])
        roughness_idx = float(features[5])
        
        label = post_results["label"]
        confidence = post_results["confidence"]
        status_message = post_results["status_message"]
        
        # 4. Business Rules & Final Freshness Score calculation
        mold_detected = (label == "mold")
        mold_confidence = confidence if mold_detected else 0.0
        
        # If classification is bruised/damaged, choose bruising based on roughness threshold
        bruising_detected = (label == "bruised/damaged" and roughness_idx > 0.4)
        bruising_confidence = confidence if bruising_detected else 0.0
        
        damage_detected = (label == "bruised/damaged" and not bruising_detected)
        damage_confidence = confidence if damage_detected else 0.0
        
        # Freshness Score computation
        if label == "mold":
            freshness_score = 0.0
        elif label == "unknown/uncertain":
            # Heuristic calculation for fallback on low confidence
            penalty = (browning_idx * 65.0) + (roughness_idx * 35.0)
            freshness_score = float(max(100.0 - penalty, 0.0))
        else:
            base_score = post_results["freshness_score_adjustment"]
            # Apply slight browning and roughness penalties
            penalty = (browning_idx * 15.0) + (roughness_idx * 10.0)
            freshness_score = float(max(base_score - penalty, 0.0))
            
        return {
            "freshness_score": round(freshness_score, 1),
            "color_degradation": round(browning_idx, 3),
            "texture_roughness": round(roughness_idx, 3),
            "mold_detected": mold_detected,
            "mold_confidence": round(mold_confidence, 2),
            "bruising_detected": bruising_detected,
            "bruising_confidence": round(bruising_confidence, 2),
            "damage_detected": damage_detected,
            "damage_confidence": round(damage_confidence, 2),
            "classification_label": label,
            "status_message": status_message
        }
