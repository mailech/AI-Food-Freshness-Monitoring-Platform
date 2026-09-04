"""
Freshness inference module.

Uses a colour-science visual analyser built on Pillow/NumPy.
The analyser detects visual spoilage signals that are food-type-agnostic:
  - Dark / necrotic patches (browning, blackening)
  - Desaturation (colour loss typical of decay)
  - Mold-like texture proxies (local contrast variance in suspicious hue ranges)
  - Overall vibrancy loss

This replaces a limited 6-class CNN that was trained only on apples/bananas/oranges
and produced unreliable results on other foods.
"""

import io
import logging

import numpy as np

logger = logging.getLogger(__name__)


class AssessmentResult(dict):
    pass


# ---------------------------------------------------------------------------
# Colour-science freshness analyser
# ---------------------------------------------------------------------------

def _analyse_freshness(pil_img) -> dict:
    """
    Analyse a PIL RGB image and return freshness signals.

    Returns a dict with keys:
      fresh_score      : 0.0 – 1.0  (1.0 = perfectly fresh)
      spoilage_score   : 0.0 – 1.0
      dark_patch_ratio : fraction of pixels that are dark/necrotic
      desat_ratio      : fraction of pixels that are desaturated/grey
      mold_ratio       : fraction in mold-like hue/saturation range
      dominant_state   : 'fresh' | 'rotten'
    """
    img = pil_img.resize((128, 128))
    arr = np.array(img, dtype=np.float32) / 255.0  # (128,128,3) in [0,1]

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # ── Brightness and chroma ───────────────────────────────────────────────
    brightness = np.max(arr, axis=2)
    saturation_range = np.max(arr, axis=2) - np.min(arr, axis=2)  # chroma proxy

    # ── Background removal ─────────────────────────────────────────────────
    # Find the dominant background colour by looking at image border pixels
    # (corners + edges) and exclude similar colours from the analysis.
    # This prevents table surfaces, countertops, studio backgrounds from
    # inflating or deflating the freshness score.
    border_pixels = np.concatenate([
        arr[0, :, :],    # top row
        arr[-1, :, :],   # bottom row
        arr[:, 0, :],    # left col
        arr[:, -1, :],   # right col
    ], axis=0)  # (N, 3)

    bg_mean = border_pixels.mean(axis=0)  # mean background colour (R, G, B)

    # Mask pixels that are "close" to the background colour
    # Euclidean distance in RGB space — threshold 0.18 covers similar shades
    dist_to_bg = np.sqrt(
        (arr[:, :, 0] - bg_mean[0]) ** 2 +
        (arr[:, :, 1] - bg_mean[1]) ** 2 +
        (arr[:, :, 2] - bg_mean[2]) ** 2
    )
    bg_mask = dist_to_bg < 0.18  # pixels that belong to background
    fg_mask = ~bg_mask            # foreground (food) pixels

    fg_count = float(np.sum(fg_mask))
    if fg_count < 200:
        # Very little foreground — fall back to whole image
        fg_mask = np.ones_like(bg_mask, dtype=bool)
        fg_count = float(fg_mask.sum())

    def _ratio(mask):
        """Fraction of foreground pixels matching mask."""
        return float(np.sum(mask & fg_mask)) / fg_count

    # ── Dark patch ratio ───────────────────────────────────────────────────
    dark_mask = brightness < 0.22
    dark_patch_ratio = _ratio(dark_mask)

    # ── Brown / decay ratio ────────────────────────────────────────────────
    brown_mask = (r > 0.30) & (g > 0.15) & (g < 0.60) & (b < 0.38) & \
                 (r > g) & (r > b) & (saturation_range > 0.08) & (brightness < 0.62)
    brown_ratio = _ratio(brown_mask)

    # ── Desaturation ratio ─────────────────────────────────────────────────
    desat_mask = (saturation_range < 0.10) & (brightness > 0.20) & (brightness < 0.80)
    desat_ratio = _ratio(desat_mask)

    # ── Mold-like patches ──────────────────────────────────────────────────
    white_mold = (brightness > 0.80) & (saturation_range < 0.07)
    green_mold = (g > r) & (g > b) & (saturation_range > 0.04) & \
                 (saturation_range < 0.30) & (brightness > 0.28) & (brightness < 0.75)
    mold_ratio = _ratio(white_mold | green_mold)

    # ── Vibrancy (fresh foods are vibrant) ────────────────────────────────
    vibrant_mask = (saturation_range > 0.25) & (brightness > 0.35) & (brightness < 0.92)
    vibrant_ratio = _ratio(vibrant_mask)

    # ── Combine signals into spoilage score ───────────────────────────────
    spoilage_raw = (
        dark_patch_ratio  * 0.45 +
        brown_ratio       * 0.30 +
        desat_ratio       * 0.15 +
        mold_ratio        * 0.10
    )
    spoilage_score = max(0.0, spoilage_raw - vibrant_ratio * 0.20)
    spoilage_score = min(1.0, spoilage_score * 1.6)

    fresh_score = 1.0 - spoilage_score
    dominant_state = "fresh" if fresh_score >= 0.5 else "rotten"

    return {
        "fresh_score": round(fresh_score, 4),
        "spoilage_score": round(spoilage_score, 4),
        "dark_patch_ratio": round(dark_patch_ratio, 4),
        "desat_ratio": round(desat_ratio, 4),
        "mold_ratio": round(mold_ratio, 4),
        "vibrant_ratio": round(vibrant_ratio, 4),
        "dominant_state": dominant_state,
    }


def _pick_label(dominant_state: str, item_name_hint: str = "") -> str:
    """
    Return a human-readable predicted_class label.
    Uses the dominant state + a generic food type label.
    """
    name = item_name_hint.lower().strip() if item_name_hint else ""

    # Map common inventory item names to food type labels
    fruit_keywords   = ["apple", "banana", "orange", "mango", "berry", "grape",
                        "strawberry", "peach", "plum", "fruit", "lemon", "lime"]
    veg_keywords     = ["potato", "tomato", "carrot", "spinach", "lettuce",
                        "broccoli", "cabbage", "onion", "pepper", "vegetable",
                        "cucumber", "zucchini", "celery"]
    dairy_keywords   = ["milk", "cheese", "yogurt", "butter", "cream", "dairy"]
    meat_keywords    = ["chicken", "beef", "pork", "fish", "salmon", "meat",
                        "seafood", "shrimp", "lamb"]

    food_type = "food"
    for kw in fruit_keywords:
        if kw in name:
            food_type = "fruit"
            break
    for kw in veg_keywords:
        if kw in name:
            food_type = "vegetable"
            break
    for kw in dairy_keywords:
        if kw in name:
            food_type = "dairy"
            break
    for kw in meat_keywords:
        if kw in name:
            food_type = "meat"
            break

    return f"{dominant_state}{food_type}"


def assess_image(file_bytes: bytes, item_name: str = "") -> AssessmentResult:
    """
    Assess the freshness of a food image.

    Parameters
    ----------
    file_bytes : raw image bytes (JPEG, PNG, WebP, or any Pillow-supported format)
    item_name  : optional inventory item name for better label generation

    Returns AssessmentResult (dict) with:
      predicted_class    : e.g. 'freshfruit', 'rottenvegetable'
      is_fresh           : bool
      confidence         : 0.0 – 1.0
      spoilage_probability : 0.0 – 1.0
      freshness_score    : 0 – 100
      category           : Fresh | Good | Acceptable | Near Spoilage | Spoiled
    """
    from PIL import Image as PilImage

    try:
        pil_img = PilImage.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"Could not decode image: {exc}") from exc

    signals = _analyse_freshness(pil_img)

    fresh_score      = signals["fresh_score"]
    spoilage_score   = signals["spoilage_score"]
    dominant_state   = signals["dominant_state"]

    is_fresh         = dominant_state == "fresh"
    confidence       = fresh_score if is_fresh else spoilage_score
    confidence       = min(1.0, confidence * 1.15 + 0.05)

    freshness_score  = round(fresh_score * 100, 1)

    if freshness_score >= 85:
        category = "Fresh"
    elif freshness_score >= 70:
        category = "Good"
    elif freshness_score >= 55:
        category = "Acceptable"
    elif freshness_score >= 40:
        category = "Near Spoilage"
    else:
        category = "Spoiled"

    predicted_class  = _pick_label(dominant_state, item_name)

    logger.info(
        "Assessed image: state=%s score=%.1f dark=%.3f brown=%.3f desat=%.3f mold=%.3f vibrant=%.3f",
        dominant_state, freshness_score,
        signals["dark_patch_ratio"], signals.get("desat_ratio", 0),
        signals.get("desat_ratio", 0), signals["mold_ratio"], signals["vibrant_ratio"],
    )

    return AssessmentResult(
        predicted_class=predicted_class,
        is_fresh=is_fresh,
        confidence=round(confidence, 4),
        spoilage_probability=round(spoilage_score, 4),
        freshness_score=freshness_score,
        category=category,
    )
