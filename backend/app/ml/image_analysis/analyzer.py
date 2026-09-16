"""Image analysis engine - orchestrates the full visual pipeline.

    validate -> decode -> resize -> normalise -> segment
             -> food classification (advisory)
             -> colour features + texture features
             -> spoilage detection
             -> freshness classification
             -> visual explanation overlay

The result is a plain dataclass so services can persist it without knowing
anything about OpenCV.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from app.core.logging_config import get_logger
from app.ml.base import (
    FoodClassification,
    FreshnessPrediction,
    SpoilagePrediction,
)
from app.ml.image_analysis.color import (
    analyze_color,
    color_degradation_score,
    dominant_colors,
)
from app.ml.image_analysis.texture import analyze_texture, texture_condition_score
from app.ml.preprocessing.image_ops import PreparedImage, encode_jpeg, prepare
from app.ml.registry import ModelRegistry, get_registry
from app.ml.spoilage.baseline import draw_overlay

logger = get_logger("app.ml.image_analysis")


@dataclass
class ImageAnalysisResult:
    prepared: PreparedImage
    features: dict[str, float]
    color_features: dict[str, float]
    texture_features: dict[str, float]
    color_score: float
    texture_score: float
    dominant_colors: list[dict[str, Any]]
    classification: FoodClassification
    spoilage: SpoilagePrediction
    freshness: FreshnessPrediction
    overlay_jpeg: bytes | None
    processing_ms: int
    pipeline_steps: list[str] = field(default_factory=list)

    # --------------------------------------------------------- convenience
    @property
    def visual_score(self) -> float:
        return self.freshness.visual_score

    def feature_summary(self) -> dict[str, Any]:
        """Compact, UI-friendly subset of the descriptors."""
        return {
            "color": {
                "mean_hue": round(self.color_features.get("mean_hue", 0.0), 2),
                "mean_saturation": round(self.color_features.get("mean_saturation", 0.0), 2),
                "mean_brightness": round(self.color_features.get("mean_value", 0.0), 2),
                "browning_ratio": round(self.color_features.get("browning_ratio", 0.0), 4),
                "dark_spot_ratio": round(self.color_features.get("dark_spot_ratio", 0.0), 4),
                "pale_ratio": round(self.color_features.get("pale_ratio", 0.0), 4),
                "color_uniformity": round(self.color_features.get("color_uniformity", 0.0), 4),
                "colourfulness": round(self.color_features.get("colourfulness", 0.0), 2),
                "score": round(self.color_score, 2),
            },
            "texture": {
                "laplacian_variance": round(self.texture_features.get("laplacian_variance", 0.0), 2),
                "edge_density": round(self.texture_features.get("edge_density", 0.0), 4),
                "local_variance_mean": round(
                    self.texture_features.get("local_variance_mean", 0.0), 2
                ),
                "ridge_ratio": round(self.texture_features.get("ridge_ratio", 0.0), 4),
                "lbp_entropy": round(self.texture_features.get("lbp_entropy", 0.0), 3),
                "glcm_contrast": round(self.texture_features.get("glcm_contrast", 0.0), 3),
                "glcm_homogeneity": round(self.texture_features.get("glcm_homogeneity", 0.0), 3),
                "score": round(self.texture_score, 2),
            },
            "segmentation": {
                "food_pixel_ratio": round(self.prepared.food_pixel_ratio, 4),
                "working_size": f"{self.prepared.working_size[0]}x{self.prepared.working_size[1]}",
                "original_size": f"{self.prepared.original_size[0]}x{self.prepared.original_size[1]}",
            },
            "dominant_colors": self.dominant_colors,
        }


class ImageAnalysisEngine:
    """Runs the visual pipeline end to end."""

    def __init__(self, registry: ModelRegistry | None = None) -> None:
        self.registry = registry or get_registry()

    def analyze_bytes(
        self,
        data: bytes,
        *,
        category_slug: str | None = None,
        build_overlay: bool = True,
    ) -> ImageAnalysisResult:
        started = time.perf_counter()
        steps: list[str] = []

        prepared = prepare(data)
        steps.extend(["decode", "orientation", "resize", "denoise", "illumination_normalise", "segment"])

        return self.analyze_prepared(
            prepared,
            category_slug=category_slug,
            build_overlay=build_overlay,
            started=started,
            steps=steps,
        )

    def analyze_prepared(
        self,
        prepared: PreparedImage,
        *,
        category_slug: str | None = None,
        build_overlay: bool = True,
        started: float | None = None,
        steps: list[str] | None = None,
    ) -> ImageAnalysisResult:
        started = started or time.perf_counter()
        steps = steps or []

        # ---- 1. visual descriptors ------------------------------------
        color_features = analyze_color(prepared)
        texture_features = analyze_texture(prepared)
        steps.extend(["color_analysis", "texture_analysis"])

        color_score = color_degradation_score(color_features)
        texture_score = texture_condition_score(texture_features)

        features: dict[str, float] = {
            **color_features,
            **texture_features,
            "color_degradation_score": color_score,
            "texture_condition_score": texture_score,
            "food_pixel_ratio": prepared.food_pixel_ratio,
        }

        # ---- 2. food classification (advisory) ------------------------
        classification = self.registry.food_classifier.classify(prepared.bgr, features)
        steps.append("food_classification")

        # ---- 3. spoilage detection ------------------------------------
        spoilage = self.registry.spoilage.detect(
            prepared, mask=prepared.mask, category_slug=category_slug, features=features
        )
        steps.append("spoilage_detection")

        mold_confidence = next(
            (
                f.confidence
                for f in spoilage.findings
                if f.indicator_type == "MOLD" and f.detected
            ),
            0.0,
        )

        # ---- 4. freshness classification ------------------------------
        freshness_context = {
            "spoilage_probability": spoilage.spoilage_probability,
            "mold_confidence": mold_confidence,
            # Raw pixels for image-based models (e.g. a CNN); feature-based
            # models ignore it.
            "image_rgb": prepared.rgb,
            # Individual findings let the freshness model apply a calibrated
            # deduction per indicator instead of only seeing the aggregate.
            "indicators": [
                {
                    "indicator_type": f.indicator_type,
                    "confidence": f.confidence,
                    "affected_area_ratio": f.affected_area_ratio,
                    "severity": f.severity,
                }
                for f in spoilage.detected_findings
            ],
        }
        try:
            freshness = self.registry.freshness.predict(
                features, category_slug=category_slug, context=freshness_context
            )
        except Exception as exc:  # noqa: BLE001 - never let a model break the pipeline
            logger.warning(
                "freshness model failed (%s); falling back to CV baseline", exc
            )
            freshness = self.registry.freshness_baseline.predict(
                features, category_slug=category_slug, context=freshness_context
            )
        steps.append("freshness_classification")

        # ---- 5. visual explanation ------------------------------------
        overlay_bytes: bytes | None = None
        if build_overlay:
            try:
                overlay_bytes = encode_jpeg(draw_overlay(prepared, spoilage))
                steps.append("explanation_overlay")
            except Exception as exc:  # noqa: BLE001 - overlay is non-essential
                logger.warning("overlay generation failed: %s", exc)

        processing_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "image analysis complete in %dms category=%s freshness=%s score=%.1f",
            processing_ms,
            category_slug,
            freshness.freshness_category,
            freshness.visual_score,
            extra={"event": "ml_prediction"},
        )

        return ImageAnalysisResult(
            prepared=prepared,
            features=features,
            color_features=color_features,
            texture_features=texture_features,
            color_score=color_score,
            texture_score=texture_score,
            dominant_colors=dominant_colors(prepared, k=3),
            classification=classification,
            spoilage=spoilage,
            freshness=freshness,
            overlay_jpeg=overlay_bytes,
            processing_ms=processing_ms,
            pipeline_steps=steps,
        )


def get_engine() -> ImageAnalysisEngine:
    return ImageAnalysisEngine()
