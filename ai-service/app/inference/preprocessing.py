"""
Image Preprocessing Pipeline for Food Freshness Classification (PyTorch)
"""
import io
from PIL import Image
from typing import Tuple, Union
import torch
from torchvision import transforms

TARGET_SIZE: Tuple[int, int] = (224, 224)
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
SUPPORTED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP", "BMP"}

inference_transform = transforms.Compose([
    transforms.Resize(TARGET_SIZE),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def validate_image_bytes(image_bytes: bytes) -> None:
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Empty image payload received.")
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"Image exceeds maximum allowable size of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB.")

def load_and_preprocess_image(image_input: Union[bytes, str, Image.Image]) -> torch.Tensor:
    """
    Loads, validates, and preprocesses an image for EfficientNet inference.
    Returns a tensor of shape (1, 3, 224, 224).
    """
    if isinstance(image_input, bytes):
        validate_image_bytes(image_input)
        try:
            pil_img = Image.open(io.BytesIO(image_input))
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image data: {e}")
    elif isinstance(image_input, str):
        try:
            pil_img = Image.open(image_input)
        except Exception as e:
            raise ValueError(f"Could not open image from path '{image_input}': {e}")
    elif isinstance(image_input, Image.Image):
        pil_img = image_input
    else:
        raise TypeError("Unsupported image input type.")

    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")

    tensor = inference_transform(pil_img)
    return tensor.unsqueeze(0)  # Shape (1, 3, 224, 224)
