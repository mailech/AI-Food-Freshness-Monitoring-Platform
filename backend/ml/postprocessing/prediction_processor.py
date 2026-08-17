import numpy as np
from typing import Dict, Any

CLASSES = ["FRESH", "SPOILED", "MOLD", "BRUISED/DAMAGED", "UNKNOWN"]

def process_prediction(probs: np.ndarray, confidence_threshold: float = 0.60) -> Dict[str, Any]:
    """
    Takes raw probability output and maps it to a standardized internal prediction object.
    Applies the low-confidence threshold to classify as UNKNOWN / MANUAL_INSPECTION_REQUIRED.
    """
    class_idx = int(np.argmax(probs))
    confidence = float(probs[class_idx])
    
    # Handle low-confidence predictions
    if confidence < confidence_threshold:
        return {
            "class": "UNKNOWN",
            "confidence": confidence,
            "detections": [],
            "model_version": "1.0.0",
            "status_message": "Uncertain — manual inspection recommended"
        }
        
    predicted_class = CLASSES[class_idx]
    
    status_messages = {
        "FRESH": "Food is fresh",
        "SPOILED": "Food is spoiled",
        "MOLD": "Mold detected on surface",
        "BRUISED/DAMAGED": "Bruising or physical damage detected",
        "UNKNOWN": "Uncertain — manual inspection recommended"
    }
    
    return {
        "class": predicted_class,
        "confidence": round(confidence, 2),
        "detections": [],
        "model_version": "1.0.0",
        "status_message": status_messages.get(predicted_class, "Normal classification")
    }
