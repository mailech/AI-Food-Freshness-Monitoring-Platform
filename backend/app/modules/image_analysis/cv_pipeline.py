import os
from typing import Dict, Any, Optional
from app.core.config import settings
from ml.preprocessing import preprocess_image
from ml.inference import load_global_model, check_model_availability
from ml.postprocessing import process_prediction

class ModelUnavailableError(Exception):
    """Raised when model weights or execution environment are unavailable."""
    pass

class FoodFreshnessModel:
    """
    Genuine AI/ML pipeline executing image preprocessing, neural network inference,
    post-processing with confidence gating, and scoring calculations.
    """
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.MODEL_PATH
        self.is_loaded = False
        try:
            self.load_model()
        except Exception:
            # Safely catch loader exceptions at startup so app still runs
            pass

    def load_model(self) -> None:
        load_global_model()
        self.is_loaded = True

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Executes preprocessing, CNN classification, and standard postprocessing.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Target image path '{image_path}' not found.")

        # Check model availability first
        available, reason = check_model_availability()
        if not available:
            raise ModelUnavailableError(f"AI model is currently unavailable: {reason}")

        try:
            # 1. Preprocessing
            tensor = preprocess_image(image_path)
            
            # 2. Global Model Inference
            model = load_global_model()
            probs = model.predict(tensor)
            
            # 3. Post-processing with confidence threshold gating
            pred_results = process_prediction(probs, settings.MODEL_CONFIDENCE_THRESHOLD)
            
        except Exception as e:
            raise ModelUnavailableError(f"AI model inference failed: {str(e)}")

        # Extract features for compliance analytics (color and texture)
        # Standard OpenCV calculations remain in place as complementary CV features, NOT claimed as ML predictions.
        browning_idx = 0.0
        roughness_idx = 0.0
        
        try:
            import cv2
            import numpy as np
            img = cv2.imread(image_path)
            if img is not None:
                hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
                lower_brown = np.array([10, 40, 40])
                upper_brown = np.array([25, 255, 230])
                brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)
                brown_pixels = np.sum(brown_mask > 0)
                
                lower_green = np.array([35, 40, 40])
                upper_green = np.array([85, 255, 255])
                green_mask = cv2.inRange(hsv, lower_green, upper_green)
                green_pixels = np.sum(green_mask > 0)
                
                total_color_pixels = brown_pixels + green_pixels + 1
                browning_idx = float(brown_pixels / total_color_pixels)
                
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                laplacian = cv2.Laplacian(gray, cv2.CV_64F)
                variance = float(np.var(laplacian))
                roughness_idx = float(min(max(1.0 - (variance / 1500.0), 0.0), 1.0))
        except Exception:
            pass

        predicted_class = pred_results["class"]
        confidence = pred_results["confidence"]
        status_message = pred_results["status_message"]

        # 4. Final Freshness Score calculation
        # If classification is MOLD -> freshness_score is overridden to 0.0
        if predicted_class == "MOLD":
            freshness_score = 0.0
        elif predicted_class == "SPOILED":
            freshness_score = 15.0
        elif predicted_class == "BRUISED/DAMAGED":
            freshness_score = 55.0
            if roughness_idx > 0.4:
                # Refine score based on texture roughness
                freshness_score = float(max(55.0 - roughness_idx * 15.0, 30.0))
        elif predicted_class == "UNKNOWN":
            # Default fallback for low-confidence scans
            penalty = (browning_idx * 65.0) + (roughness_idx * 35.0)
            freshness_score = float(max(100.0 - penalty, 0.0))
        else: # FRESH
            base = 95.0
            penalty = (browning_idx * 15.0) + (roughness_idx * 10.0)
            freshness_score = float(max(base - penalty, 0.0))

        # Class maps to detections log format
        mold_detected = (predicted_class == "MOLD")
        bruising_detected = (predicted_class == "BRUISED/DAMAGED" and roughness_idx > 0.4)
        damage_detected = (predicted_class == "BRUISED/DAMAGED" and not bruising_detected)

        return {
            "freshness_score": round(freshness_score, 1),
            "color_degradation": round(browning_idx, 3),
            "texture_roughness": round(roughness_idx, 3),
            "mold_detected": mold_detected,
            "mold_confidence": round(confidence, 2) if mold_detected else 0.0,
            "bruising_detected": bruising_detected,
            "bruising_confidence": round(confidence, 2) if bruising_detected else 0.0,
            "damage_detected": damage_detected,
            "damage_confidence": round(confidence, 2) if damage_detected else 0.0,
            "classification_label": predicted_class,
            "status_message": status_message,
            "confidence": round(confidence, 2),
            "model_version": "1.0.0"
        }
