"""Texture analysis for food surface condition.

Descriptors (all OpenCV / NumPy, no external model):

* Laplacian variance        - overall sharpness / structural detail
* Sobel gradient statistics - edge strength and density
* GLCM (contrast, homogeneity, energy, correlation, entropy) computed from a
  quantised grey-level co-occurrence matrix
* Local Binary Pattern histogram (uniform-ish 8-neighbour LBP) - micro texture,
  sensitive to fuzzy mould growth and shrivelling
* Local variance statistics  - blotchiness / roughness
* Wrinkle / shrivel proxy    - ridge response from a morphological black-hat

A fuzzy mould colony raises LBP entropy and local variance while *lowering*
Laplacian sharpness, which is why several complementary metrics are kept.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.ml.preprocessing.image_ops import PreparedImage

GLCM_LEVELS = 16
LBP_BINS = 10


def _glcm(gray: np.ndarray, mask: np.ndarray, distance: int = 1) -> dict[str, float]:
    """Grey-level co-occurrence statistics averaged over 4 directions."""
    quantised = (gray.astype(np.float32) / 256.0 * GLCM_LEVELS).astype(np.int32)
    quantised = np.clip(quantised, 0, GLCM_LEVELS - 1)
    valid = mask > 0

    offsets = ((0, distance), (distance, 0), (distance, distance), (distance, -distance))
    matrix = np.zeros((GLCM_LEVELS, GLCM_LEVELS), dtype=np.float64)

    for dy, dx in offsets:
        src = quantised
        # Shift, keeping only overlapping pixels valid in both positions.
        shifted = np.roll(np.roll(quantised, -dy, axis=0), -dx, axis=1)
        shifted_valid = np.roll(np.roll(valid, -dy, axis=0), -dx, axis=1)
        keep = valid & shifted_valid
        if dy > 0:
            keep[-dy:, :] = False
        if dx > 0:
            keep[:, -dx:] = False
        elif dx < 0:
            keep[:, :(-dx)] = False
        a = src[keep].ravel()
        b = shifted[keep].ravel()
        if a.size == 0:
            continue
        np.add.at(matrix, (a, b), 1.0)

    total = matrix.sum()
    if total <= 0:
        return {
            "glcm_contrast": 0.0,
            "glcm_homogeneity": 0.0,
            "glcm_energy": 0.0,
            "glcm_correlation": 0.0,
            "glcm_entropy": 0.0,
        }

    prob = matrix / total
    prob = (prob + prob.T) / 2.0  # symmetric
    i_idx, j_idx = np.meshgrid(
        np.arange(GLCM_LEVELS), np.arange(GLCM_LEVELS), indexing="ij"
    )
    diff = (i_idx - j_idx).astype(np.float64)

    contrast = float(np.sum(prob * diff**2))
    homogeneity = float(np.sum(prob / (1.0 + np.abs(diff))))
    energy = float(np.sqrt(np.sum(prob**2)))
    nonzero = prob[prob > 0]
    entropy = float(-np.sum(nonzero * np.log2(nonzero)))

    mu_i = float(np.sum(i_idx * prob))
    mu_j = float(np.sum(j_idx * prob))
    sigma_i = float(np.sqrt(np.sum(prob * (i_idx - mu_i) ** 2)))
    sigma_j = float(np.sqrt(np.sum(prob * (j_idx - mu_j) ** 2)))
    if sigma_i > 1e-9 and sigma_j > 1e-9:
        correlation = float(
            np.sum(prob * (i_idx - mu_i) * (j_idx - mu_j)) / (sigma_i * sigma_j)
        )
    else:
        correlation = 0.0

    return {
        "glcm_contrast": contrast,
        "glcm_homogeneity": homogeneity,
        "glcm_energy": energy,
        "glcm_correlation": correlation,
        "glcm_entropy": entropy,
    }


def _lbp_histogram(gray: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, float]:
    """8-neighbour Local Binary Pattern histogram (10 rotation-grouped bins)."""
    padded = cv2.copyMakeBorder(gray, 1, 1, 1, 1, cv2.BORDER_REFLECT)
    center = gray.astype(np.int16)
    codes = np.zeros(gray.shape, dtype=np.uint8)
    neighbours = (
        (0, 0), (0, 1), (0, 2),
        (1, 2), (2, 2), (2, 1),
        (2, 0), (1, 0),
    )
    for bit, (dy, dx) in enumerate(neighbours):
        window = padded[dy:dy + gray.shape[0], dx:dx + gray.shape[1]].astype(np.int16)
        codes |= ((window >= center).astype(np.uint8) << bit)

    # Group by popcount -> 9 uniform-ish bins + 1 spare, giving rotation invariance.
    popcount = np.unpackbits(codes.reshape(-1, 1), axis=1).sum(axis=1).reshape(codes.shape)
    values = popcount[mask > 0] if np.count_nonzero(mask) else popcount.reshape(-1)
    hist, _ = np.histogram(values, bins=LBP_BINS, range=(0, LBP_BINS))
    hist_norm = hist.astype(np.float64) / float(max(1, values.size))
    nonzero = hist_norm[hist_norm > 0]
    entropy = float(-np.sum(nonzero * np.log2(nonzero))) if nonzero.size else 0.0
    return hist_norm, entropy


def analyze_texture(prepared: PreparedImage) -> dict[str, float]:
    """Return a flat dict of texture descriptors."""
    gray = prepared.gray
    mask = prepared.mask
    valid = mask > 0
    if not np.any(valid):
        valid = np.ones_like(mask, dtype=bool)

    # --- sharpness / structural detail ---------------------------------
    laplacian = cv2.Laplacian(gray, cv2.CV_64F, ksize=3)
    lap_values = laplacian[valid]
    lap_var = float(lap_values.var())

    # --- gradients ------------------------------------------------------
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
    mag_values = magnitude[valid]

    edges = cv2.Canny(gray, 60, 160)
    edge_density = float(np.count_nonzero(edges[valid])) / float(max(1, np.count_nonzero(valid)))

    # --- local variance (blotchiness) -----------------------------------
    gray_f = gray.astype(np.float32)
    mean_local = cv2.blur(gray_f, (9, 9))
    mean_sq_local = cv2.blur(gray_f * gray_f, (9, 9))
    local_var = np.clip(mean_sq_local - mean_local**2, 0, None)
    local_var_values = local_var[valid]

    # --- wrinkle / shrivel proxy ---------------------------------------
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    ridge_ratio = float(np.count_nonzero(blackhat[valid] > 18)) / float(
        max(1, np.count_nonzero(valid))
    )

    lbp_hist, lbp_entropy = _lbp_histogram(gray, mask)

    features: dict[str, float] = {
        "laplacian_variance": lap_var,
        "laplacian_mean_abs": float(np.abs(lap_values).mean()),
        "gradient_mean": float(mag_values.mean()),
        "gradient_std": float(mag_values.std()),
        "gradient_p95": float(np.percentile(mag_values, 95)) if mag_values.size else 0.0,
        "edge_density": edge_density,
        "local_variance_mean": float(local_var_values.mean()),
        "local_variance_std": float(local_var_values.std()),
        "ridge_ratio": ridge_ratio,
        "lbp_entropy": lbp_entropy,
        "gray_mean": float(gray[valid].mean()),
        "gray_std": float(gray[valid].std()),
    }
    features.update({f"lbp_bin_{i}": float(lbp_hist[i]) for i in range(LBP_BINS)})
    features.update(_glcm(gray, mask))
    return features


def texture_condition_score(features: dict[str, float]) -> float:
    """0-100 where 100 means a smooth, intact, healthy-looking surface.

    Reference bands were chosen empirically against the sample images shipped in
    `data/sample`. They are heuristics, not calibrated science - which is why the
    result is always labelled as a baseline estimate.
    """
    lap_var = features.get("laplacian_variance", 200.0)
    local_var = features.get("local_variance_mean", 120.0)
    ridge = features.get("ridge_ratio", 0.05)
    lbp_entropy = features.get("lbp_entropy", 2.0)
    glcm_contrast = features.get("glcm_contrast", 6.0)
    glcm_homogeneity = features.get("glcm_homogeneity", 0.5)

    penalty = 0.0
    # Excessive fine-scale roughness / mottling.
    penalty += min(20.0, max(0.0, (local_var - 320.0)) * 0.045)
    # Ridges and creases -> shrivelling, wrinkling, collapse.
    penalty += min(22.0, max(0.0, ridge - 0.055) * 210.0)
    # High micro-texture entropy -> fuzzy growth or heavy degradation.
    penalty += min(18.0, max(0.0, lbp_entropy - 2.35) * 34.0)
    # Very high GLCM contrast -> strong blotching.
    penalty += min(14.0, max(0.0, glcm_contrast - 11.0) * 1.3)
    # Low homogeneity -> irregular surface.
    penalty += min(12.0, max(0.0, 0.42 - glcm_homogeneity) * 62.0)
    # Very low sharpness usually means a blurred photo, not a bad food item -
    # a small penalty plus reduced confidence elsewhere.
    if lap_var < 45.0:
        penalty += min(8.0, (45.0 - lap_var) * 0.16)

    return float(np.clip(100.0 - penalty, 0.0, 100.0))


def blur_confidence_factor(features: dict[str, float]) -> float:
    """0.55-1.0 multiplier: blurry input should reduce reported confidence."""
    lap_var = features.get("laplacian_variance", 200.0)
    if lap_var >= 140.0:
        return 1.0
    if lap_var <= 20.0:
        return 0.55
    return float(0.55 + (lap_var - 20.0) / (140.0 - 20.0) * 0.45)
