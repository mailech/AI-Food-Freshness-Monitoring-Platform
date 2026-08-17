import os
import numpy as np

class ModelUnavailableError(Exception):
    """Exception raised when the AI model is not found or loaded."""
    pass

class FreshnessMLInference:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.w1 = None
        self.b1 = None
        self.w2 = None
        self.b2 = None
        self.is_loaded = False
        
    def load_model(self) -> None:
        """
        Loads pre-trained weights from the configured path.
        Raises ModelUnavailableError if the model file is not found.
        """
        if not self.model_path or not os.path.exists(self.model_path):
            raise ModelUnavailableError("AI model is currently unavailable.")
            
        try:
            data = np.load(self.model_path)
            self.w1 = data['w1']
            self.b1 = data['b1']
            self.w2 = data['w2']
            self.b2 = data['b2']
            self.is_loaded = True
        except Exception as e:
            raise ModelUnavailableError(f"AI model is currently unavailable. Load error: {str(e)}")
            
    def predict(self, features: np.ndarray) -> np.ndarray:
        """
        Executes real neural network feedforward prediction using NumPy.
        """
        if not self.is_loaded:
            raise ModelUnavailableError("AI model is currently unavailable.")
            
        # MLP forward pass
        # Layer 1: Linear + ReLU
        h1 = np.dot(features, self.w1) + self.b1
        h1 = np.maximum(h1, 0)
        
        # Layer 2: Linear
        logits = np.dot(h1, self.w2) + self.b2
        
        # Softmax
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / np.sum(exp_logits)
        return probs
