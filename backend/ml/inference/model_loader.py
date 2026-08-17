import os
import logging
from typing import Optional
from app.core.config import settings
from .freshness_model import PyTorchFreshnessModel

logger = logging.getLogger("ml_model_loader")

# Global singleton to keep the model loaded in memory across requests
_GLOBAL_MODEL_INSTANCE: Optional[PyTorchFreshnessModel] = None

def get_device(configured_device: str = "auto") -> str:
    """
    Dynamically detects CUDA availability and returns the target execution device.
    """
    if configured_device == "cuda":
        return "cuda"
    elif configured_device == "cpu":
        return "cpu"
        
    # Automatic check
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass
    return "cpu"

def load_global_model(force_reload: bool = False) -> PyTorchFreshnessModel:
    """
    Initializes and loads the model once, keeping it in memory.
    Raises FileNotFoundError or ImportError if weights/libs are missing.
    """
    global _GLOBAL_MODEL_INSTANCE
    
    if _GLOBAL_MODEL_INSTANCE is not None and not force_reload:
        return _GLOBAL_MODEL_INSTANCE

    model_path = settings.MODEL_PATH
    device = get_device(settings.MODEL_DEVICE)
    
    model = PyTorchFreshnessModel()
    model.load_model(model_path, device)
    
    _GLOBAL_MODEL_INSTANCE = model
    logger.info(f"Successfully loaded model from {model_path} onto {device}.")
    return _GLOBAL_MODEL_INSTANCE

def check_model_availability() -> tuple[bool, str]:
    """
    Checks if model can be loaded, returning status and failure details.
    """
    if settings.DEMO_MODE:
        return True, "Available (Demo Mode)"
        
    try:
        import torch
    except ImportError:
        return False, "PyTorch library is not installed in the environment"
        
    model_path = settings.MODEL_PATH
    if not model_path or not os.path.exists(model_path):
        return False, "Model weights file not found"
        
    try:
        load_global_model()
        return True, "Available"
    except Exception as e:
        return False, f"Model loading failed: {str(e)}"
