import numpy as np
from typing import Dict, Any

CLASSES = ["fresh", "spoiled", "mold", "bruised/damaged", "unknown/uncertain"]

def postprocess_prediction(probs: np.ndarray, confidence_threshold: float = 0.50) -> Dict[str, Any]:
    """
    Takes model output probabilities and applies post-processing and thresholds.
    """
    class_idx = int(np.argmax(probs))
    confidence = float(probs[class_idx])
    
    # Check if confidence is below threshold
    if confidence < confidence_threshold:
        return {
            "label": "unknown/uncertain",
            "confidence": confidence,
            "status_message": "Uncertain — manual inspection recommended",
            "freshness_score_adjustment": 50.0 # middle default
        }
        
    label = CLASSES[class_idx]
    
    # Map label to state parameters
    status_message = "Normal classification"
    freshness_score_adjustment = 100.0
    
    if label == "fresh":
        status_message = "Food is fresh"
        freshness_score_adjustment = 95.0
    elif label == "spoiled":
        status_message = "Food is spoiled"
        freshness_score_adjustment = 20.0
    elif label == "mold":
        status_message = "Mold detected on surface"
        freshness_score_adjustment = 0.0
    elif label == "bruised/damaged":
        status_message = "Bruising or physical damage detected"
        freshness_score_adjustment = 55.0
    elif label == "unknown/uncertain":
        status_message = "Uncertain — manual inspection recommended"
        freshness_score_adjustment = 50.0
        
    return {
        "label": label,
        "confidence": confidence,
        "status_message": status_message,
        "freshness_score_adjustment": freshness_score_adjustment
    }
