from abc import ABC, abstractmethod
from typing import Any

class FreshnessModelInterface(ABC):
    """
    Standardized interface for food freshness ML models.
    Decouples specific frameworks (PyTorch, TensorFlow, ONNX) from application routers.
    """
    @abstractmethod
    def load_model(self, model_path: str, device: str) -> None:
        """Loads model weights from the specified path on the target device."""
        pass

    @abstractmethod
    def predict(self, preprocessed_image: Any) -> Any:
        """Executes forward pass inference and returns raw predictions."""
        pass
