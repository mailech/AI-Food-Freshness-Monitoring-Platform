"""OpenCV baseline spoilage detector.

HONEST LABELLING
----------------
This is a *transparent computer-vision baseline*, not a trained neural network.
Each indicator is produced by an explicit, inspectable rule over colour and
texture evidence, and every result is tagged `detector="opencv-baseline"` and
`is_demo=True` so the UI never presents it as a trained model's output.

Detected indicators
-------------------
MOLD                 fuzzy, desaturated blue/grey/white or dark green colonies
BRUISING             localised dark patches that keep the base hue
DISCOLORATION        brown/olive shift away from the expected colour family
PHYSICAL_DAMAGE      strong edges/cuts inside the food region
SURFACE_DEGRADATION  overall roughness + entropy rise
COLOR_DEGRADATION    aggregate colour-band deviation
TEXTURE_CHANGE       aggregate texture deviation
DRYNESS              ridged, pale, low-saturation surface
WETNESS              specular highlights + saturated dark pooling
"""

from __future__ import annotations

import cv2
import numpy as np

from app.core.category_rules import get_profile
from app.core.enums import ModelKind, SpoilageIndicatorType
from app.ml.base import (
    DetectedRegion,
    ModelInfo,
    SpoilageDetectionModel,
    SpoilageFinding,
    SpoilagePrediction,
)
from app.ml.preprocessing.image_ops import PreparedImage

MIN_REGION_AREA_RATIO = 0.0018
MAX_REGIONS_PER_INDICATOR = 6

# How strongly each indicator implies actual spoilage (as opposed to a cosmetic
# quality loss). Used by the noisy-OR aggregation. Mould is close to decisive;
# a dent is mostly cosmetic.
INDICATOR_SPOILAGE_WEIGHT: dict[str, float] = {
    SpoilageIndicatorType.MOLD.value: 0.95,
    SpoilageIndicatorType.DISCOLORATION.value: 0.55,
    SpoilageIndicatorType.SURFACE_DEGRADATION.value: 0.45,
    SpoilageIndicatorType.BRUISING.value: 0.45,
    SpoilageIndicatorType.WETNESS.value: 0.40,
    SpoilageIndicatorType.COLOR_DEGRADATION.value: 0.40,
    SpoilageIndicatorType.TEXTURE_CHANGE.value: 0.38,
    SpoilageIndicatorType.DRYNESS.value: 0.35,
    SpoilageIndicatorType.PHYSICAL_DAMAGE.value: 0.28,
}


def _severity(confidence: float, area_ratio: float) -> str:
    weight = confidence * 0.65 + min(1.0, area_ratio * 6.0) * 0.35
    if weight >= 0.72:
        return "CRITICAL"
    if weight >= 0.52:
        return "HIGH"
    if weight >= 0.32:
        return "MEDIUM"
    if weight >= 0.15:
        return "LOW"
    return "INFO"


def _regions_from_mask(binary: np.ndarray, total_pixels: int) -> tuple[list[DetectedRegion], float]:
    """Convert a binary detection mask into bounding boxes + affected area."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=1)

    count, labels, stats, _ = cv2.connectedComponentsWithStats(cleaned, connectivity=8)
    regions: list[DetectedRegion] = []
    affected = 0
    min_area = max(24, int(total_pixels * MIN_REGION_AREA_RATIO))

    order = np.argsort(-stats[1:, cv2.CC_STAT_AREA]) + 1 if count > 1 else []
    for label in order:
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area:
            continue
        affected += area
        if len(regions) < MAX_REGIONS_PER_INDICATOR:
            x = int(stats[label, cv2.CC_STAT_LEFT])
            y = int(stats[label, cv2.CC_STAT_TOP])
            w = int(stats[label, cv2.CC_STAT_WIDTH])
            h = int(stats[label, cv2.CC_STAT_HEIGHT])
            regions.append(
                DetectedRegion(
                    x=x, y=y, width=w, height=h,
                    score=float(min(1.0, area / max(1.0, total_pixels * 0.12))),
                )
            )
    return regions, float(affected) / float(max(1, total_pixels))


class OpenCVSpoilageDetector(SpoilageDetectionModel):
    """Rule-based spoilage detection over colour + texture evidence."""

    NAME = "opencv-spoilage-baseline"
    VERSION = "1.1.0"

    @property
    def info(self) -> ModelInfo:
        return ModelInfo(
            name=self.NAME,
            version=self.VERSION,
            kind=ModelKind.BASELINE,
            description=(
                "Transparent OpenCV baseline: HSV/LAB colour-band segmentation plus "
                "texture descriptors. No trained weights - every indicator comes from "
                "an inspectable rule."
            ),
            is_demo=True,
        )

    # ------------------------------------------------------------ detectors
    def _detect_mold(self, prepared: PreparedImage, total: int) -> SpoilageFinding:
        hsv = prepared.hsv
        hue, sat, val = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
        food = prepared.mask > 0

        # Reference saturation of the food itself, so "desaturated" is measured
        # relative to this item rather than against a fixed constant.
        food_sat = sat[food]
        if food_sat.size == 0:
            food_sat = sat.reshape(-1)
        median_sat = float(np.median(food_sat))

        # Fuzzy colonies: desaturated blue-grey/white OR dark dull green,
        # combined with local texture (fuzz breaks up smooth surfaces).
        blue_grey = (hue >= 88) & (hue <= 140) & (sat < 95) & (val > 55) & (val < 205)
        dull_green = (hue >= 38) & (hue <= 88) & (sat > 28) & (sat < 105) & (val < 150)
        # Grey/white fuzz: clearly less saturated than the surrounding food and
        # not a specular highlight.
        relative_grey = (
            (sat < max(60.0, median_sat - 38.0)) & (val > 60) & (val < 244)
        )

        gray_f = prepared.gray.astype(np.float32)
        local_mean = cv2.blur(gray_f, (11, 11))
        local_var = np.clip(cv2.blur(gray_f * gray_f, (11, 11)) - local_mean**2, 0, None)
        fuzzy = local_var > 40  # textured, not a flat highlight

        candidate = (blue_grey | dull_green | (relative_grey & fuzzy)) & food
        binary = (candidate.astype(np.uint8)) * 255
        regions, area_ratio = _regions_from_mask(binary, total)

        # Confidence rises with affected area and with fragmented colonies
        # (mould grows as multiple discrete patches).
        fragmentation_bonus = 0.10 if len(regions) >= 3 else (0.05 if len(regions) == 2 else 0.0)
        confidence = float(np.clip(area_ratio * 7.5 + fragmentation_bonus, 0.0, 0.97))
        detected = area_ratio >= 0.006 and confidence >= 0.16
        return SpoilageFinding(
            indicator_type=SpoilageIndicatorType.MOLD.value,
            label="Possible mould growth",
            confidence=confidence if detected else min(confidence, 0.12),
            severity=_severity(confidence, area_ratio),
            affected_area_ratio=area_ratio,
            detected=detected,
            description=(
                f"{len(regions)} desaturated, textured patch(es) covering "
                f"{area_ratio * 100:.1f}% of the food surface - consistent with mould "
                "colonies. Confirm manually before discarding."
                if detected
                else "No mould-like colour or texture clusters were isolated."
            ),
            regions=regions if detected else [],
            detector=self.NAME,
        )

    def _detect_bruising(self, prepared: PreparedImage, total: int) -> SpoilageFinding:
        hsv = prepared.hsv
        val = hsv[:, :, 2].astype(np.float32)
        sat = hsv[:, :, 1].astype(np.float32)
        food = prepared.mask > 0

        food_val = val[food]
        if food_val.size == 0:
            food_val = val.reshape(-1)
        # Bruises are locally dark relative to the item but keep some saturation.
        threshold = float(np.percentile(food_val, 22))
        dark = (val <= max(28.0, threshold * 0.82)) & (sat > 38) & food
        binary = dark.astype(np.uint8) * 255
        regions, area_ratio = _regions_from_mask(binary, total)

        confidence = float(np.clip(area_ratio * 6.2, 0.0, 0.94))
        detected = area_ratio >= 0.012 and len(regions) >= 1
        return SpoilageFinding(
            indicator_type=SpoilageIndicatorType.BRUISING.value,
            label="Bruising / soft dark patches",
            confidence=confidence if detected else min(confidence, 0.1),
            severity=_severity(confidence, area_ratio),
            affected_area_ratio=area_ratio,
            detected=detected,
            description=(
                f"{len(regions)} localised dark region(s) covering {area_ratio * 100:.1f}% "
                "of the surface, consistent with bruising."
                if detected
                else "No localised darkening consistent with bruising."
            ),
            regions=regions if detected else [],
            detector=self.NAME,
        )

    def _detect_discoloration(
        self, prepared: PreparedImage, total: int, color_features: dict[str, float]
    ) -> SpoilageFinding:
        hsv = prepared.hsv
        hue, sat, val = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
        food = prepared.mask > 0
        brown = (hue >= 8) & (hue <= 32) & (sat > 45) & (val < 168) & food
        binary = brown.astype(np.uint8) * 255
        regions, area_ratio = _regions_from_mask(binary, total)

        browning_ratio = color_features.get("browning_ratio", area_ratio)
        uniformity = color_features.get("color_uniformity", 1.0)
        confidence = float(
            np.clip(browning_ratio * 4.6 + max(0.0, 0.72 - uniformity) * 0.85, 0.0, 0.95)
        )
        detected = browning_ratio >= 0.045 or (area_ratio >= 0.05 and uniformity < 0.66)
        return SpoilageFinding(
            indicator_type=SpoilageIndicatorType.DISCOLORATION.value,
            label="Discoloration / browning",
            confidence=confidence if detected else min(confidence, 0.12),
            severity=_severity(confidence, max(area_ratio, browning_ratio)),
            affected_area_ratio=max(area_ratio, browning_ratio),
            detected=detected,
            description=(
                f"Brown/olive pixels account for {browning_ratio * 100:.1f}% of the food "
                f"region (colour uniformity {uniformity:.2f})."
                if detected
                else "Colour distribution is within the expected band."
            ),
            regions=regions if detected else [],
            detector=self.NAME,
        )

    def _detect_physical_damage(
        self, prepared: PreparedImage, total: int, texture_features: dict[str, float]
    ) -> SpoilageFinding:
        food = prepared.mask > 0
        # Strong internal edges that are not the silhouette -> cuts, splits, dents.
        eroded = cv2.erode(
            prepared.mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)), iterations=1
        )
        interior = eroded > 0
        edges = cv2.Canny(prepared.gray, 90, 210)
        internal = (edges > 0) & interior

        binary = (internal.astype(np.uint8)) * 255
        binary = cv2.dilate(binary, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        regions, area_ratio = _regions_from_mask(binary, total)

        interior_pixels = max(1, int(np.count_nonzero(interior)))
        internal_edge_density = float(np.count_nonzero(internal)) / interior_pixels
        ridge = texture_features.get("ridge_ratio", 0.0)

        confidence = float(np.clip(internal_edge_density * 3.1 + ridge * 1.5, 0.0, 0.9))
        detected = internal_edge_density >= 0.085 and confidence >= 0.2
        return SpoilageFinding(
            indicator_type=SpoilageIndicatorType.PHYSICAL_DAMAGE.value,
            label="Physical damage / surface breaks",
            confidence=confidence if detected else min(confidence, 0.1),
            severity=_severity(confidence, area_ratio),
            affected_area_ratio=area_ratio,
            detected=detected,
            description=(
                f"Internal edge density {internal_edge_density:.3f} suggests cuts, splits "
                "or dents inside the food outline."
                if detected
                else "No unusual internal edge structure detected."
            ),
            regions=regions[:3] if detected else [],
            detector=self.NAME,
        )

    def _detect_surface_degradation(
        self, texture_features: dict[str, float], texture_score: float
    ) -> SpoilageFinding:
        deficit = max(0.0, 82.0 - texture_score) / 82.0
        confidence = float(np.clip(deficit * 1.15, 0.0, 0.93))
        detected = texture_score < 68.0
        return SpoilageFinding(
            indicator_type=SpoilageIndicatorType.SURFACE_DEGRADATION.value,
            label="Surface degradation",
            confidence=confidence if detected else min(confidence, 0.12),
            severity=_severity(confidence, deficit * 0.3),
            affected_area_ratio=round(deficit * 0.5, 4),
            detected=detected,
            description=(
                f"Texture condition score {texture_score:.0f}/100 "
                f"(LBP entropy {texture_features.get('lbp_entropy', 0):.2f}, "
                f"ridge ratio {texture_features.get('ridge_ratio', 0):.3f})."
            ),
            detector=self.NAME,
        )

    def _detect_dryness_wetness(
        self, prepared: PreparedImage, color_features: dict[str, float],
        texture_features: dict[str, float]
    ) -> list[SpoilageFinding]:
        pale = color_features.get("pale_ratio", 0.0)
        ridge = texture_features.get("ridge_ratio", 0.0)
        saturation = color_features.get("mean_saturation", 120.0)

        dry_conf = float(np.clip(pale * 2.4 + max(0.0, ridge - 0.05) * 4.0, 0.0, 0.88))
        dry_detected = pale >= 0.14 and ridge >= 0.055 and saturation < 95

        hsv = prepared.hsv
        food = prepared.mask > 0
        specular = ((hsv[:, :, 2] > 238) & (hsv[:, :, 1] < 45) & food)
        specular_ratio = float(np.count_nonzero(specular)) / float(max(1, np.count_nonzero(food)))
        wet_conf = float(np.clip(specular_ratio * 5.5, 0.0, 0.85))
        wet_detected = specular_ratio >= 0.045

        return [
            SpoilageFinding(
                indicator_type=SpoilageIndicatorType.DRYNESS.value,
                label="Dehydration / shrivelling",
                confidence=dry_conf if dry_detected else min(dry_conf, 0.1),
                severity=_severity(dry_conf, pale),
                affected_area_ratio=pale,
                detected=dry_detected,
                description=(
                    f"Pale low-saturation surface ({pale * 100:.1f}%) with ridged texture."
                    if dry_detected
                    else "Surface hydration appears normal."
                ),
                detector=self.NAME,
            ),
            SpoilageFinding(
                indicator_type=SpoilageIndicatorType.WETNESS.value,
                label="Excess surface moisture",
                confidence=wet_conf if wet_detected else min(wet_conf, 0.1),
                severity=_severity(wet_conf, specular_ratio),
                affected_area_ratio=specular_ratio,
                detected=wet_detected,
                description=(
                    f"Specular highlights over {specular_ratio * 100:.1f}% of the surface "
                    "suggest liquid or slime. Confirm manually - bright lighting can "
                    "produce the same signature."
                    if wet_detected
                    else "No pooling or slime signature detected."
                ),
                detector=self.NAME,
            ),
        ]

    # -------------------------------------------------------------- public
    def detect(
        self,
        image: PreparedImage | np.ndarray,
        *,
        mask: np.ndarray | None = None,
        category_slug: str | None = None,
        features: dict[str, float] | None = None,
    ) -> SpoilagePrediction:
        if not isinstance(image, PreparedImage):
            raise TypeError("OpenCVSpoilageDetector.detect expects a PreparedImage")

        prepared = image
        feats = features or {}
        total = int(np.count_nonzero(prepared.mask)) or prepared.mask.size

        color_features = {k: v for k, v in feats.items()}
        texture_score = float(feats.get("texture_condition_score", 80.0))

        findings = [
            self._detect_mold(prepared, total),
            self._detect_bruising(prepared, total),
            self._detect_discoloration(prepared, total, color_features),
            self._detect_physical_damage(prepared, total, color_features),
            self._detect_surface_degradation(color_features, texture_score),
        ]
        findings.extend(self._detect_dryness_wetness(prepared, color_features, color_features))

        # ---- aggregate into a single spoilage probability ------------------
        # Severity-weighted noisy-OR. A mean over all indicators would dilute a
        # single decisive finding (one confident mould patch means spoiled, no
        # matter how many other checks came back clean), so independent evidence
        # is combined multiplicatively instead.
        profile = get_profile(category_slug)
        key_indicators = set(profile.key_indicators)

        survival = 1.0
        for finding in findings:
            if not finding.detected:
                continue
            weight = INDICATOR_SPOILAGE_WEIGHT.get(finding.indicator_type, 0.4)
            if finding.indicator_type in key_indicators:
                weight = min(0.98, weight * 1.25)  # matters more for this category
            contribution = float(np.clip(finding.confidence * weight, 0.0, 0.98))
            survival *= (1.0 - contribution)

        spoilage_probability = float(np.clip(1.0 - survival, 0.0, 0.99))

        # A confident mould detection dominates: mould is a hard stop.
        mold = next(
            (f for f in findings if f.indicator_type == SpoilageIndicatorType.MOLD.value), None
        )
        if mold and mold.detected and mold.confidence > 0.45:
            spoilage_probability = max(spoilage_probability, 0.72 + mold.confidence * 0.25)

        return SpoilagePrediction(
            spoilage_probability=min(0.99, spoilage_probability),
            findings=findings,
            model_info=self.info,
        )


def draw_overlay(prepared: PreparedImage, prediction: SpoilagePrediction) -> np.ndarray:
    """Render detected regions onto a copy of the image (visual explanation)."""
    canvas = prepared.bgr.copy()

    # Soft outline of the detected food region.
    contours, _ = cv2.findContours(prepared.mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(canvas, contours, -1, (120, 200, 120), 1)

    palette = {
        SpoilageIndicatorType.MOLD.value: (60, 60, 220),
        SpoilageIndicatorType.BRUISING.value: (200, 120, 40),
        SpoilageIndicatorType.DISCOLORATION.value: (40, 170, 235),
        SpoilageIndicatorType.PHYSICAL_DAMAGE.value: (220, 90, 200),
    }

    for finding in prediction.detected_findings:
        color = palette.get(finding.indicator_type, (0, 165, 255))
        for region in finding.regions:
            cv2.rectangle(
                canvas,
                (region.x, region.y),
                (region.x + region.width, region.y + region.height),
                color,
                2,
            )
        if finding.regions:
            top = finding.regions[0]
            label = f"{finding.indicator_type.replace('_', ' ').title()} {finding.confidence:.0%}"
            y = max(12, top.y - 6)
            cv2.putText(
                canvas, label, (top.x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA
            )

    banner = "BASELINE CV ANALYSIS - not a trained model"
    cv2.rectangle(canvas, (0, canvas.shape[0] - 18), (canvas.shape[1], canvas.shape[0]), (35, 35, 35), -1)
    cv2.putText(
        canvas, banner, (6, canvas.shape[0] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.38,
        (235, 235, 235), 1, cv2.LINE_AA,
    )
    return canvas
