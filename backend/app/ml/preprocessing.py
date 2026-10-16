import io
from typing import Union
import numpy as np
from PIL import Image, UnidentifiedImageError

TARGET_SIZE = (224, 224)


class ImageValidationError(ValueError):
    """Raised when an uploaded image is corrupted, unreadable, or not a valid image format."""
    pass


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Safely loads and verifies a PIL Image from raw bytes.
    Raises ImageValidationError on invalid or corrupted data.
    """
    if not image_bytes or len(image_bytes) == 0:
        raise ImageValidationError("Uploaded image file is empty.")

    try:
        image_stream = io.BytesIO(image_bytes)
        image = Image.open(image_stream)
        # Verify file integrity
        image.verify()
        # Re-open stream because verify() closes or alters the stream pointer
        image_stream.seek(0)
        image = Image.open(image_stream)
        return image
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as e:
        raise ImageValidationError(f"Invalid or corrupted image file: {str(e)}") from e


def preprocess_image(image_input: Union[bytes, Image.Image, io.BytesIO]) -> np.ndarray:
    """Preprocesses an input image for the Food Freshness CNN model.
    Steps:
      1. Load PIL Image from bytes or verify existing PIL Image.
      2. Convert image mode to RGB (handles RGBA, Grayscale, CMYK, etc.).
      3. Resize to 224 x 224 using high-quality Bilinear resampling.
      4. Normalize pixel values to [0.0, 1.0] (float32).
      5. Expand batch dimensions to shape (1, 224, 224, 3).
    Returns:
      numpy.ndarray of shape (1, 224, 224, 3) and dtype float32.
    """
    if isinstance(image_input, bytes):
        pil_image = load_image_from_bytes(image_input)
    elif isinstance(image_input, io.BytesIO):
        pil_image = load_image_from_bytes(image_input.getvalue())
    elif isinstance(image_input, Image.Image):
        pil_image = image_input
    else:
        raise ImageValidationError(f"Unsupported image input type: {type(image_input)}")

    try:
        # Convert to RGB (dropping alpha channels or converting palette/grayscale to RGB)
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        # Resize to model input size 224x224
        # Use Image.Resampling.BILINEAR or Image.BILINEAR based on Pillow version
        resample_filter = getattr(Image.Resampling, "BILINEAR", Image.BILINEAR)
        resized_image = pil_image.resize(TARGET_SIZE, resample=resample_filter)

        # Convert to float32 array normalized to [0.0, 1.0]
        img_array = np.asarray(resized_image, dtype=np.float32) / 255.0

        # Expand batch dimension: (224, 224, 3) -> (1, 224, 224, 3)
        batched_tensor = np.expand_dims(img_array, axis=0)
        return batched_tensor
    except Exception as e:
        if isinstance(e, ImageValidationError):
            raise
        raise ImageValidationError(f"Failed to preprocess image: {str(e)}") from e
