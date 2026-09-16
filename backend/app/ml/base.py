"""Model interfaces for the inference layer.

Every model the platform uses is defined here as an abstract contract so that a
trained network can replace a baseline without touching a single service or
router. Production inference never imports notebooks or training code.

Contract summary
----------------
FoodClassificationModel  image  -> what food is this?
FreshnessModel           image features (+context) -> freshness class & probability
SpoilageDetectionModel   image  -> list of spoilage indicators (+regions)
ShelfLifeModel           tabular features -> remaining days (+interval)
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from app.core.enums import FreshnessCategory, ModelKind, RiskLevel


# --------------------------------------------------------------- data objects
@dataclass
class ModelInfo:
    """Provenance for a loaded model - surfaced in the API and the UI."""

    name: str
    version: str
    kind: ModelKind
    description: str
    # True whenever the output is NOT produced by a trained, evaluated model.
    is_demo: bool = True
    artefact_path: str | None = None
    trained_on: str | None = None
    metrics: dict[str, float] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "kind": str(self.kind),
            "description": self.description,
            "is_demo": self.is_demo,
            "artefact_path": self.artefact_path,
            "trained_on": self.trained_on,
            "metrics": self.metrics or {},
            "label": "Demo / Baseline Analysis" if self.is_demo else "Trained Model Prediction",
        }


@dataclass
class FreshnessPrediction:
    freshness_category: FreshnessCategory
    freshness_probability: float          # probability of the winning class, 0..1
    confidence: float                    # 0..1 - how trustworthy the call is
    visual_score: float                  # 0..100 visual condition component
    detected_indicators: list[str] = field(default_factory=list)
    class_probabilities: dict[str, float] = field(default_factory=dict)
    features: dict[str, float] = field(default_factory=dict)
    model_info: ModelInfo | None = None
    notes: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "freshness_category": str(self.freshness_category),
            "freshness_probability": round(self.freshness_probability, 4),
            "confidence": round(self.confidence, 4),
            "visual_score": round(self.visual_score, 2),
            "detected_indicators": list(self.detected_indicators),
            "class_probabilities": {k: round(v, 4) for k, v in self.class_probabilities.items()},
            "model": self.model_info.as_dict() if self.model_info else None,
            "notes": self.notes,
        }


@dataclass
class DetectedRegion:
    x: int
    y: int
    width: int
    height: int
    score: float

    def as_dict(self) -> dict[str, Any]:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "score": round(self.score, 4),
        }


@dataclass
class SpoilageFinding:
    indicator_type: str
    label: str
    confidence: float
    severity: str
    affected_area_ratio: float = 0.0
    detected: bool = True
    description: str | None = None
    regions: list[DetectedRegion] = field(default_factory=list)
    detector: str = "opencv-baseline"

    def __post_init__(self) -> None:
        # OpenCV/numpy comparisons yield numpy.bool_, which the stdlib json
        # encoder rejects ("Object of type bool is not JSON serializable")
        # when findings are persisted inside JSON columns. Normalise here so
        # every consumer (JSON columns, boolean columns, API responses) gets
        # a real Python bool.
        self.detected = bool(self.detected)

    def as_dict(self) -> dict[str, Any]:
        return {
            "indicator_type": self.indicator_type,
            "label": self.label,
            "confidence": round(self.confidence, 4),
            "severity": self.severity,
            "affected_area_ratio": round(self.affected_area_ratio, 4),
            "detected": self.detected,
            "description": self.description,
            "regions": [r.as_dict() for r in self.regions],
            "detector": self.detector,
        }


@dataclass
class SpoilagePrediction:
    spoilage_probability: float
    findings: list[SpoilageFinding] = field(default_factory=list)
    model_info: ModelInfo | None = None

    @property
    def detected_findings(self) -> list[SpoilageFinding]:
        return [f for f in self.findings if f.detected]

    def as_dict(self) -> dict[str, Any]:
        return {
            "spoilage_probability": round(self.spoilage_probability, 4),
            "findings": [f.as_dict() for f in self.findings],
            "model": self.model_info.as_dict() if self.model_info else None,
        }


@dataclass
class FoodClassification:
    label: str
    category_slug: str
    confidence: float
    top_k: list[tuple[str, float]] = field(default_factory=list)
    model_info: ModelInfo | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "label": self.label,
            "category_slug": self.category_slug,
            "confidence": round(self.confidence, 4),
            "top_k": [{"label": l, "confidence": round(c, 4)} for l, c in self.top_k],
            "model": self.model_info.as_dict() if self.model_info else None,
        }


@dataclass
class ShelfLifePredictionResult:
    remaining_days: float
    confidence: float
    risk_level: RiskLevel
    lower_bound_days: float
    upper_bound_days: float
    factors: dict[str, float] = field(default_factory=dict)
    features: dict[str, Any] = field(default_factory=dict)
    explanation: str | None = None
    model_info: ModelInfo | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "remaining_days": round(self.remaining_days, 2),
            "confidence": round(self.confidence, 4),
            "risk_level": str(self.risk_level),
            "lower_bound_days": round(self.lower_bound_days, 2),
            "upper_bound_days": round(self.upper_bound_days, 2),
            "factors": {k: round(v, 4) for k, v in self.factors.items()},
            "explanation": self.explanation,
            "model": self.model_info.as_dict() if self.model_info else None,
        }


# ---------------------------------------------------------------- interfaces
class BaseModelInterface(ABC):
    """Common lifecycle for every inference component."""

    @property
    @abstractmethod
    def info(self) -> ModelInfo: ...

    def load(self) -> bool:
        """Load weights/artefacts. Returns True when a real artefact was loaded."""
        return False

    @property
    def is_ready(self) -> bool:
        return True


class FoodClassificationModel(BaseModelInterface):
    @abstractmethod
    def classify(self, image: np.ndarray, features: dict[str, float] | None = None) -> FoodClassification: ...


class FreshnessModel(BaseModelInterface):
    @abstractmethod
    def predict(
        self,
        features: dict[str, float],
        *,
        category_slug: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> FreshnessPrediction: ...


class SpoilageDetectionModel(BaseModelInterface):
    @abstractmethod
    def detect(
        self,
        image: np.ndarray,
        *,
        mask: np.ndarray | None = None,
        category_slug: str | None = None,
        features: dict[str, float] | None = None,
    ) -> SpoilagePrediction: ...


class ShelfLifeModel(BaseModelInterface):
    @abstractmethod
    def predict(self, features: dict[str, Any]) -> ShelfLifePredictionResult: ...
