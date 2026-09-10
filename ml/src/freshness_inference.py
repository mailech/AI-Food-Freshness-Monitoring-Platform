"""Inference for the trained six-class food-freshness image classifier."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path


CLASS_NAMES = (
    "freshapples", "rottenapples", "freshbanana", "rottenbanana", "freshoranges", "rottenoranges",
)
MODEL_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "final_food_freshness_model.keras"


class ModelUnavailableError(RuntimeError):
    """The trained model cannot be loaded for inference."""


class InvalidImageError(ValueError):
    """The supplied file cannot be decoded as a supported image."""


class InferenceError(RuntimeError):
    """The model could not produce a valid prediction."""


@lru_cache(maxsize=1)
def _model():
    """Load the model once per process, independent of the working directory."""
    if not MODEL_PATH.is_file():
        raise ModelUnavailableError(f"Freshness model file is missing: {MODEL_PATH}")
    try:
        import tensorflow as tf
        return tf.keras.models.load_model(MODEL_PATH, compile=False)
    except Exception as exc:
        raise ModelUnavailableError("Freshness model could not be loaded.") from exc


def _prepare_image(image_path: Path):
    try:
        import numpy as np
        from PIL import Image, UnidentifiedImageError
    except ImportError as exc:
        raise ModelUnavailableError("Image inference dependencies are unavailable.") from exc
    try:
        with Image.open(image_path) as image:
            image.verify()
        with Image.open(image_path) as image:
            pixels = np.asarray(image.convert("RGB").resize((224, 224)), dtype=np.float32)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError("Uploaded image is invalid or corrupted.") from exc
    try:
        from tensorflow.keras.applications.efficientnet import preprocess_input
        # Current Keras EfficientNet models apply this as a pass-through because
        # their rescaling layer is part of the model, but keep it explicit.
        return np.expand_dims(preprocess_input(pixels), axis=0)
    except Exception as exc:
        raise ModelUnavailableError("TensorFlow preprocessing is unavailable.") from exc


def predict_freshness(image_path: str | Path) -> dict[str, object]:
    """Return raw class probabilities from the trained six-class softmax model."""
    batch = _prepare_image(Path(image_path))
    try:
        import numpy as np

        probabilities = np.asarray(_model().predict(batch, verbose=0), dtype=np.float64).reshape(-1)
    except ModelUnavailableError:
        raise
    except Exception as exc:
        raise InferenceError("Freshness model inference failed.") from exc
    if probabilities.size != len(CLASS_NAMES) or not np.isfinite(probabilities).all():
        raise InferenceError("Freshness model returned an invalid prediction.")
    index = int(np.argmax(probabilities))
    return {
        "predicted_class": CLASS_NAMES[index],
        "confidence": float(probabilities[index]),
        "all_class_probabilities": {name: float(probabilities[position]) for position, name in enumerate(CLASS_NAMES)},
    }
