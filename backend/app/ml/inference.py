from typing import Dict, Union, Any
import numpy as np
from PIL import Image

from app.ml.model import get_freshness_model
from app.ml.preprocessing import preprocess_image

# EXACT class order specified for the trained food freshness CNN model
# Do NOT determine class order using os.listdir(), alphabetical filesystem order, or any dynamically generated ordering.
CLASS_NAMES = [
    "freshapples",
    "freshbanana",
    "freshoranges",
    "rottenapples",
    "rottenbanana",
    "rottenoranges"
]

CLASS_TO_FOOD = {
    "freshapples": "Apple",
    "freshbanana": "Banana",
    "freshoranges": "Orange",
    "rottenapples": "Apple",
    "rottenbanana": "Banana",
    "rottenoranges": "Orange",
}

CLASS_TO_STATUS = {
    "freshapples": "Fresh",
    "freshbanana": "Fresh",
    "freshoranges": "Fresh",
    "rottenapples": "Rotten",
    "rottenbanana": "Rotten",
    "rottenoranges": "Rotten",
}


def predict_freshness(image_input: Union[bytes, np.ndarray, Image.Image]) -> Dict[str, Any]:
    """Runs inference on the pre-trained Food Freshness CNN model.
    Accepts:
      image_input: Raw image bytes, PIL Image, or preprocessed numpy array.
    Returns:
      Dict with predicted food, fresh/rotten status, confidence percentage,
      top class name, and full 6-class softmax probabilities.
    """
    if isinstance(image_input, np.ndarray) and image_input.shape == (1, 224, 224, 3):
        tensor = image_input
    else:
        tensor = preprocess_image(image_input)

    model = get_freshness_model()

    try:
        raw_preds = model.predict(tensor, verbose=0)
    except Exception as e:
        raise RuntimeError(f"CNN inference prediction failed: {str(e)}") from e

    probs = raw_preds[0]
    top_idx = int(np.argmax(probs))
    predicted_class = CLASS_NAMES[top_idx]
    confidence_score = float(probs[top_idx])
    confidence_pct = round(confidence_score * 100.0, 1)

    predicted_food = CLASS_TO_FOOD.get(predicted_class, "Apple")
    predicted_status = CLASS_TO_STATUS.get(predicted_class, "Fresh")

    all_probabilities = {
        CLASS_NAMES[i]: round(float(probs[i]), 6)
        for i in range(len(CLASS_NAMES))
    }

    return {
        "food": predicted_food,
        "status": predicted_status,
        "confidence": confidence_pct,
        "confidence_score": round(confidence_score, 4),
        "predicted_class": predicted_class,
        "probabilities": all_probabilities,
    }
