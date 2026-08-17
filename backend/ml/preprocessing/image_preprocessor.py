import os
import numpy as np
from PIL import Image
from typing import Tuple, Any

def preprocess_image(image_path: str, target_size: Tuple[int, int] = (224, 224)) -> Any:
    """
    Loads an image, converts it to RGB, resizes it, normalizes pixels using ImageNet standard,
    and returns a standardized tensor/array.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    try:
        # Load and convert to RGB
        img = Image.open(image_path).convert("RGB")
        
        # Dimension validation
        if img.size[0] < 32 or img.size[1] < 32:
            raise ValueError("Image dimensions are too small (must be at least 32x32).")
            
        # Resize
        img = img.resize(target_size)
        
        # Convert to numpy array
        img_arr = np.array(img, dtype=np.float32) / 255.0
        
        # Normalize: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img_arr = (img_arr - mean) / std
        
        # Transpose to Channel-First (C, H, W)
        img_arr = img_arr.transpose(2, 0, 1)
        
        # Try converting to torch tensor if torch is installed
        try:
            import torch
            tensor = torch.from_numpy(img_arr).unsqueeze(0)  # batch dimension (1, C, H, W)
            return tensor
        except ImportError:
            return np.expand_dims(img_arr, axis=0)  # fallback to (1, C, H, W) numpy array
            
    except Exception as e:
        if isinstance(e, ValueError) or isinstance(e, FileNotFoundError):
            raise e
        raise ValueError(f"Invalid or corrupted image format: {str(e)}")
