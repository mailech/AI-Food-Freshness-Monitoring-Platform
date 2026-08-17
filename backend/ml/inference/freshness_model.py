import os
from typing import Any
from .base_model import FreshnessModelInterface

# Try importing torch dynamically to avoid startup failures on uninstalled systems
try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

if HAS_TORCH:
    class FoodFreshnessCNN(nn.Module):
        """
        PyTorch CNN classifier architecture for food freshness detection.
        Outputs logits for 5 classes: [FRESH, SPOILED, MOLD, BRUISED_DAMAGED, UNKNOWN].
        """
        def __init__(self, num_classes: int = 5):
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(3, 16, kernel_size=3, padding=1),
                nn.BatchNorm2d(16),
                nn.ReLU(),
                nn.MaxPool2d(2, 2),
                nn.Conv2d(16, 32, kernel_size=3, padding=1),
                nn.BatchNorm2d(32),
                nn.ReLU(),
                nn.MaxPool2d(2, 2),
                nn.Conv2d(32, 64, kernel_size=3, padding=1),
                nn.BatchNorm2d(64),
                nn.ReLU(),
                nn.AdaptiveAvgPool2d((1, 1))
            )
            self.classifier = nn.Sequential(
                nn.Linear(64, 32),
                nn.ReLU(),
                nn.Linear(32, num_classes)
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            x = self.features(x)
            x = x.view(x.size(0), -1)
            return self.classifier(x)
else:
    # Placeholder so references do not raise NameError
    class FoodFreshnessCNN:
        pass


class PyTorchFreshnessModel(FreshnessModelInterface):
    """
    Concrete implementation of FreshnessModelInterface running PyTorch CNN inference.
    """
    def __init__(self):
        self.model = None
        self.device = "cpu"
        self.is_loaded = False

    def load_model(self, model_path: str, device: str) -> None:
        if not HAS_TORCH:
            raise ImportError("PyTorch library is not installed in this environment.")
            
        if not model_path or not os.path.exists(model_path):
            raise FileNotFoundError(f"Model weights file not found at: {model_path}")
            
        self.device = device
        self.model = FoodFreshnessCNN()
        
        try:
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            self.model.to(self.device)
            self.model.eval()
            self.is_loaded = True
        except Exception as e:
            raise RuntimeError(f"Failed to load weights state dict: {str(e)}")

    def predict(self, preprocessed_image: Any) -> Any:
        if not self.is_loaded:
            raise RuntimeError("Model weights have not been successfully loaded.")
            
        import torch
        with torch.no_grad():
            # If input is a numpy array, convert it to torch tensor
            if not isinstance(preprocessed_image, torch.Tensor):
                tensor = torch.from_numpy(preprocessed_image).to(self.device)
            else:
                tensor = preprocessed_image.to(self.device)
                
            outputs = self.model(tensor)
            probs = torch.softmax(outputs, dim=1)
            return probs.cpu().numpy()[0]
