import os
import threading
from pathlib import Path
from typing import Optional
from app.core.config import settings

# Global cached model instance and lock for thread-safe singleton initialization
_model_instance = None
_model_lock = threading.Lock()


def _patch_keras_deserializer():
    """Patches Keras Dense.from_config to ensure backward compatibility across Keras versions
    where quantization_config might be present in saved configurations.
    """
    try:
        import keras
        orig_dense_from_config = keras.layers.Dense.from_config

        if not getattr(keras.layers.Dense, "_fresh_os_patched", False):
            @classmethod
            def safe_dense_from_config(cls, config):
                if isinstance(config, dict):
                    config.pop("quantization_config", None)
                return orig_dense_from_config(config)

            keras.layers.Dense.from_config = safe_dense_from_config
            keras.layers.Dense._fresh_os_patched = True
    except Exception:
        # If patching fails, let standard loading proceed
        pass


def resolve_model_path(model_path_str: Optional[str] = None) -> Path:
    """Resolves the model path to an absolute path.
    Checks relative to project root or current working directory.
    """
    path_str = model_path_str or settings.MODEL_PATH
    p = Path(path_str)
    if p.is_absolute():
        return p

    # If running from backend directory:
    backend_dir = Path(__file__).resolve().parent.parent.parent
    candidate_1 = backend_dir / path_str
    if candidate_1.exists():
        return candidate_1

    # Check cwd:
    candidate_2 = Path.cwd() / path_str
    if candidate_2.exists():
        return candidate_2

    # Default to candidate_1
    return candidate_1


def load_freshness_model(model_path: Optional[str] = None):
    """Loads the food freshness CNN model from disk using Keras.
    Ensures the model is loaded once and cached as a singleton.
    """
    global _model_instance

    if _model_instance is not None:
        return _model_instance

    with _model_lock:
        if _model_instance is not None:
            return _model_instance

        resolved_path = resolve_model_path(model_path)
        if not resolved_path.exists():
            raise FileNotFoundError(
                f"Freshness CNN model file not found at '{resolved_path}'. "
                f"Please ensure 'food_freshness_cnn.keras' exists at that location."
            )

        _patch_keras_deserializer()

        try:
            import keras
            loaded = keras.models.load_model(str(resolved_path), compile=False)
            _model_instance = loaded
            print(f"[Fresh.OS ML] Freshness CNN model loaded successfully from: {resolved_path}")
            return _model_instance
        except Exception as e:
            raise RuntimeError(f"Failed to load CNN model from '{resolved_path}': {str(e)}") from e


def get_freshness_model():
    """Returns the loaded freshness model singleton.
    Loads it on first invocation if not already loaded.
    """
    return load_freshness_model()
