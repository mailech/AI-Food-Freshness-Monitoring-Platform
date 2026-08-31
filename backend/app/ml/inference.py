import json
import logging
from functools import lru_cache
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# app/ml/inference.py -> backend/ml (repo layout: backend/app/ml)
MODEL_DIR = Path(__file__).resolve().parents[2] / "ml"

# CNN class -> freshness score contribution.
FRESH_PREFIX = "fresh"
ROT_PREFIX = "rotten"


@lru_cache
def load_model():
    import tensorflow as tf

    model = tf.keras.models.load_model(MODEL_DIR / "freshness_cnn.keras")
    logger.info("Freshness CNN loaded")
    return model


@lru_cache
def load_class_names() -> list[str]:
    with open(MODEL_DIR / "class_names.json") as f:
        raw = json.load(f)
    return [raw[str(i)] for i in range(len(raw))]


class AssessmentResult(dict):
    pass


def assess_image(file_bytes: bytes) -> AssessmentResult:
    """Run the freshness CNN on image bytes.

    Returns dict with:
      predicted_class: raw CNN class label (e.g. 'freshapples')
      is_fresh: bool
      confidence: model probability for the predicted class
      spoilage_probability: 1 - fresh-probability mass
      freshness_score: 0-100 visual condition score
      category: Fresh | Good | Acceptable | Near Spoilage | Spoiled
    """
    import tensorflow as tf

    model = load_model()
    class_names = load_class_names()

    img = tf.io.decode_image(file_bytes, channels=3, expand_animations=False)
    img = tf.image.resize(img, (224, 224))
    batch = tf.expand_dims(img, 0)
    batch = tf.keras.applications.mobilenet_v2.preprocess_input(batch)

    probs = model.predict(batch, verbose=0)[0]

    fresh_idx = [i for i, n in enumerate(class_names) if n.lower().startswith(FRESH_PREFIX)]
    rotten_idx = [i for i, n in enumerate(class_names) if n.lower().startswith(ROT_PREFIX)]

    fresh_mass = float(np.sum(probs[fresh_idx]))
    rotten_mass = float(np.sum(probs[rotten_idx]))
    total = fresh_mass + rotten_mass or 1.0
    fresh_ratio = fresh_mass / total

    pred_idx = int(np.argmax(probs))
    predicted_class = class_names[pred_idx]
    is_fresh = predicted_class.lower().startswith(FRESH_PREFIX)
    confidence = float(probs[pred_idx])

    score = round(fresh_ratio * 100, 1)
    if score >= 85:
        category = "Fresh"
    elif score >= 70:
        category = "Good"
    elif score >= 55:
        category = "Acceptable"
    elif score >= 40:
        category = "Near Spoilage"
    else:
        category = "Spoiled"

    return AssessmentResult(
        predicted_class=predicted_class,
        is_fresh=is_fresh,
        confidence=round(confidence, 4),
        spoilage_probability=round(rotten_mass / total, 4),
        freshness_score=score,
        category=category,
    )
