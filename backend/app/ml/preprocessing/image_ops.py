"""Image preprocessing pipeline steps.

Order of operations (see `prepare`):

    bytes -> decode -> orientation fix -> resize -> denoise -> mask -> normalise

Everything here is pure OpenCV/NumPy: no model weights required, so the whole
pipeline runs in DEMO_MODE with zero downloads.
"""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import settings
from app.core.errors import InvalidImageError

MAX_DIMENSION = 4096
MIN_DIMENSION = 32


@dataclass
class PreparedImage:
    """A decoded, resized image plus the derived artefacts analysis needs."""

    bgr: np.ndarray                 # resized BGR uint8 working image
    rgb: np.ndarray                 # same image in RGB
    hsv: np.ndarray                 # HSV conversion (reused by colour analysis)
    lab: np.ndarray                 # CIELAB conversion (perceptual colour)
    gray: np.ndarray                # grayscale (texture analysis)
    mask: np.ndarray                # uint8 0/255 food-region mask
    original_size: tuple[int, int]  # (width, height) before resizing
    working_size: tuple[int, int]
    checksum: str
    meta: dict[str, Any] = field(default_factory=dict)

    @property
    def food_pixel_ratio(self) -> float:
        total = self.mask.size or 1
        return float(np.count_nonzero(self.mask)) / total


def validate_image_bytes(data: bytes, content_type: str | None, filename: str | None) -> None:
    """Reject anything that is not a real, in-policy JPEG/PNG.

    Content-type headers and file extensions are attacker-controlled, so the
    magic bytes are verified with Pillow as well.
    """
    if not data:
        raise InvalidImageError("The uploaded file is empty.")

    if len(data) > settings.max_upload_bytes:
        raise InvalidImageError(
            f"The image exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
            code="FILE_TOO_LARGE",
            status_code=413,
        )

    if content_type and content_type.lower().split(";")[0].strip() not in settings.ALLOWED_IMAGE_MIME_TYPES:
        raise InvalidImageError(
            f"Unsupported content type '{content_type}'. Allowed: "
            f"{', '.join(settings.ALLOWED_IMAGE_MIME_TYPES)}."
        )

    if filename:
        suffix = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
        if suffix not in settings.ALLOWED_IMAGE_EXTENSIONS:
            raise InvalidImageError(
                f"Unsupported file extension '{suffix or 'none'}'. Allowed: "
                f"{', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}."
            )

    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()  # structural check; does not decode pixel data
        with Image.open(io.BytesIO(data)) as probe:
            fmt = (probe.format or "").upper()
            width, height = probe.size
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError(
            "The file could not be decoded as an image. It may be corrupt or "
            "disguised as an image."
        ) from exc

    if fmt not in {"JPEG", "JPG", "PNG"}:
        raise InvalidImageError(f"Image format '{fmt or 'unknown'}' is not supported.")
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise InvalidImageError(
            f"The image is too small ({width}x{height}). Minimum is "
            f"{MIN_DIMENSION}x{MIN_DIMENSION} pixels."
        )
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise InvalidImageError(
            f"The image is too large ({width}x{height}). Maximum is "
            f"{MAX_DIMENSION}x{MAX_DIMENSION} pixels."
        )


def decode(data: bytes) -> tuple[np.ndarray, tuple[int, int]]:
    """Decode to BGR, honouring EXIF orientation. Returns (bgr, original_size)."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            img = ImageOps.exif_transpose(img)
            rgb = img.convert("RGB")
            original_size = rgb.size  # (w, h)
            array = np.asarray(rgb, dtype=np.uint8)
    except Exception as exc:  # noqa: BLE001 - normalise to a client error
        raise InvalidImageError("The image could not be decoded.") from exc
    return cv2.cvtColor(array, cv2.COLOR_RGB2BGR), original_size


def resize_longest(bgr: np.ndarray, target: int) -> np.ndarray:
    """Aspect-preserving resize so the longest edge equals `target`."""
    height, width = bgr.shape[:2]
    longest = max(height, width)
    if longest == target:
        return bgr
    scale = target / float(longest)
    interp = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    return cv2.resize(bgr, (max(1, int(round(width * scale))), max(1, int(round(height * scale)))), interpolation=interp)


def denoise(bgr: np.ndarray) -> np.ndarray:
    """Mild edge-preserving smoothing so texture metrics are not noise-driven."""
    return cv2.bilateralFilter(bgr, d=5, sigmaColor=45, sigmaSpace=45)


def normalize_illumination(bgr: np.ndarray) -> np.ndarray:
    """CLAHE on the L channel - compensates for uneven shop/fridge lighting."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    merged = cv2.merge((clahe.apply(l_channel), a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def normalize_float(bgr: np.ndarray) -> np.ndarray:
    """Scale to float32 in [0, 1] - the input format a CNN head would expect."""
    return bgr.astype(np.float32) / 255.0


def segment_food_region(bgr: np.ndarray) -> np.ndarray:
    """Best-effort separation of the food from its background.

    Strategy: saturation/value thresholding (food is usually more saturated than
    a plate or worktop) combined with Otsu on the grayscale image, cleaned with
    morphology and reduced to the largest connected component. When the result
    is implausible the whole frame is used instead - a wrong mask is worse than
    no mask.
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    _, sat_mask = cv2.threshold(saturation, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    _, gray_mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    mask = cv2.bitwise_or(sat_mask, gray_mask)
    # Drop near-black (shadow) and blown-out (specular) pixels.
    mask[value < 18] = 0
    mask[value > 250] = 0

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)

    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        mask = np.where(labels == largest, 255, 0).astype(np.uint8)

    ratio = float(np.count_nonzero(mask)) / float(mask.size or 1)
    if ratio < 0.06 or ratio > 0.985:
        # Implausible segmentation - analyse the whole frame.
        return np.full(gray.shape, 255, dtype=np.uint8)
    return mask


def prepare(
    data: bytes,
    *,
    target_size: int | None = None,
    apply_clahe: bool = True,
) -> PreparedImage:
    """Run the full preprocessing pipeline over raw upload bytes."""
    target = target_size or settings.IMAGE_ANALYSIS_SIZE
    bgr_full, original_size = decode(data)

    working = resize_longest(bgr_full, target)
    working = denoise(working)
    if apply_clahe:
        working = normalize_illumination(working)

    mask = segment_food_region(working)
    height, width = working.shape[:2]

    return PreparedImage(
        bgr=working,
        rgb=cv2.cvtColor(working, cv2.COLOR_BGR2RGB),
        hsv=cv2.cvtColor(working, cv2.COLOR_BGR2HSV),
        lab=cv2.cvtColor(working, cv2.COLOR_BGR2LAB),
        gray=cv2.cvtColor(working, cv2.COLOR_BGR2GRAY),
        mask=mask,
        original_size=original_size,
        working_size=(width, height),
        checksum=hashlib.sha256(data).hexdigest(),
        meta={
            "resized_from": f"{original_size[0]}x{original_size[1]}",
            "resized_to": f"{width}x{height}",
            "clahe_applied": apply_clahe,
            "target_longest_edge": target,
        },
    )


def encode_png(bgr: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", bgr)
    if not ok:  # pragma: no cover - only on OpenCV build issues
        raise InvalidImageError("Failed to encode the generated image.")
    return buffer.tobytes()


def encode_jpeg(bgr: np.ndarray, quality: int = 88) -> bytes:
    ok, buffer = cv2.imencode(".jpg", bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:  # pragma: no cover
        raise InvalidImageError("Failed to encode the generated image.")
    return buffer.tobytes()
