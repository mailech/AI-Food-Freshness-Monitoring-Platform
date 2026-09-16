"""Colour analysis for food freshness.

Produces interpretable statistics rather than a black-box embedding, so the UI
can explain what the analysis actually observed:

* brightness / saturation / colourfulness
* hue histogram over 12 bins (which colour families dominate)
* browning ratio      - pixels in the brown/olive band (enzymatic browning)
* dark-spot ratio     - very dark low-saturation pixels (rot, deep bruising)
* pale ratio          - washed-out pixels (dehydration, bleaching)
* colour uniformity   - 1 - normalised hue spread (mottling detector)
* green/red/yellow ratios - ripeness proxies for produce
"""

from __future__ import annotations

import cv2
import numpy as np

from app.ml.preprocessing.image_ops import PreparedImage

# OpenCV encodes hue as 0-179 (i.e. degrees / 2).
HUE_BINS = 12


def _masked(channel: np.ndarray, mask: np.ndarray) -> np.ndarray:
    values = channel[mask > 0]
    return values if values.size else channel.reshape(-1)


def analyze_color(prepared: PreparedImage) -> dict[str, float]:
    """Return a flat dict of colour descriptors (all values JSON-friendly)."""
    hsv, lab, mask = prepared.hsv, prepared.lab, prepared.mask

    hue = _masked(hsv[:, :, 0], mask).astype(np.float32)
    sat = _masked(hsv[:, :, 1], mask).astype(np.float32)
    val = _masked(hsv[:, :, 2], mask).astype(np.float32)

    l_ch = _masked(lab[:, :, 0], mask).astype(np.float32)
    a_ch = _masked(lab[:, :, 1], mask).astype(np.float32) - 128.0
    b_ch = _masked(lab[:, :, 2], mask).astype(np.float32) - 128.0

    total = float(hue.size) or 1.0

    # --- hue histogram (normalised) -------------------------------------
    hist, _ = np.histogram(hue, bins=HUE_BINS, range=(0, 180))
    hist_norm = hist.astype(np.float32) / total

    # --- circular hue statistics ---------------------------------------
    radians = hue * (np.pi / 90.0)  # 0..179 -> 0..2*pi
    mean_cos = float(np.cos(radians).mean())
    mean_sin = float(np.sin(radians).mean())
    resultant = float(np.hypot(mean_cos, mean_sin))  # 1 == single hue
    hue_circular_std = float(np.sqrt(max(0.0, -2.0 * np.log(max(resultant, 1e-6)))))

    # --- degradation-related pixel populations -------------------------
    # Brown / olive band: hue 8-32 (OpenCV) with mid saturation and low value.
    browning = np.count_nonzero((hue >= 8) & (hue <= 32) & (sat > 45) & (val < 165))
    # Dark spots: very low value, desaturated -> rot / deep bruising.
    dark_spots = np.count_nonzero((val < 62) & (sat < 110))
    # Pale / washed out: low saturation with high value -> dehydration, bleaching.
    pale = np.count_nonzero((sat < 42) & (val > 175))
    # Ripeness proxies.
    green = np.count_nonzero((hue >= 35) & (hue <= 85) & (sat > 55))
    red = np.count_nonzero(((hue <= 8) | (hue >= 168)) & (sat > 70))
    yellow = np.count_nonzero((hue > 20) & (hue < 35) & (sat > 70))
    # Grey/blue-grey mould family (bluish-grey fuzz on bakery/dairy).
    grey_blue = np.count_nonzero((hue >= 90) & (hue <= 135) & (sat < 90) & (val < 190))

    # Hasler & Susstrunk colourfulness metric.
    colourfulness = float(
        np.sqrt(a_ch.std() ** 2 + b_ch.std() ** 2)
        + 0.3 * np.sqrt(a_ch.mean() ** 2 + b_ch.mean() ** 2)
    )

    return {
        "mean_hue": float(hue.mean()),
        "mean_saturation": float(sat.mean()),
        "mean_value": float(val.mean()),
        "std_hue": float(hue.std()),
        "std_saturation": float(sat.std()),
        "std_value": float(val.std()),
        "hue_circular_std": hue_circular_std,
        "color_uniformity": float(resultant),
        "mean_lightness": float(l_ch.mean() * 100.0 / 255.0),
        "mean_a": float(a_ch.mean()),
        "mean_b": float(b_ch.mean()),
        "colourfulness": colourfulness,
        "browning_ratio": browning / total,
        "dark_spot_ratio": dark_spots / total,
        "pale_ratio": pale / total,
        "green_ratio": green / total,
        "red_ratio": red / total,
        "yellow_ratio": yellow / total,
        "grey_blue_ratio": grey_blue / total,
        "hue_hist_entropy": float(
            -np.sum(hist_norm[hist_norm > 0] * np.log2(hist_norm[hist_norm > 0]))
        ),
        **{f"hue_bin_{i}": float(hist_norm[i]) for i in range(HUE_BINS)},
    }


def color_degradation_score(features: dict[str, float]) -> float:
    """0-100 where 100 means no observable colour degradation.

    Penalties are additive and clipped; each term maps a measured ratio to a
    bounded deduction so a single extreme value cannot dominate the result.
    """
    browning = features.get("browning_ratio", 0.0)
    dark = features.get("dark_spot_ratio", 0.0)
    pale = features.get("pale_ratio", 0.0)
    uniformity = features.get("color_uniformity", 1.0)
    saturation = features.get("mean_saturation", 120.0)

    penalty = 0.0
    penalty += min(38.0, browning * 145.0)      # browning is the strongest signal
    penalty += min(34.0, dark * 190.0)          # dark rot spots
    penalty += min(18.0, pale * 70.0)           # dehydration / bleaching
    penalty += min(14.0, max(0.0, (0.72 - uniformity)) * 48.0)  # mottling
    # Very desaturated produce tends to be old; very dark too.
    if saturation < 55:
        penalty += min(10.0, (55.0 - saturation) * 0.32)

    return float(np.clip(100.0 - penalty, 0.0, 100.0))


def dominant_colors(prepared: PreparedImage, k: int = 3) -> list[dict[str, float]]:
    """k-means dominant colours over the food region (for the UI colour strip)."""
    pixels = prepared.rgb[prepared.mask > 0]
    if pixels.size == 0:
        pixels = prepared.rgb.reshape(-1, 3)
    if pixels.shape[0] > 6000:
        idx = np.random.default_rng(42).choice(pixels.shape[0], 6000, replace=False)
        pixels = pixels[idx]
    samples = pixels.astype(np.float32)

    k = max(1, min(k, samples.shape[0]))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(
        samples, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS
    )
    labels = labels.reshape(-1)
    out: list[dict[str, float]] = []
    for index, center in enumerate(centers):
        share = float(np.count_nonzero(labels == index)) / float(labels.size or 1)
        r, g, b = (int(round(float(c))) for c in center)
        out.append(
            {
                "hex": f"#{r:02x}{g:02x}{b:02x}",
                "r": r,
                "g": g,
                "b": b,
                "share": round(share, 4),
            }
        )
    return sorted(out, key=lambda item: item["share"], reverse=True)
