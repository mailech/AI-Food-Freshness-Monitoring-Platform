"""Model registry.

Single place where inference models are selected, loaded and described.

Selection policy
----------------
* `DEMO_MODE=true`  -> always use the transparent baselines. Nothing is loaded
  from disk, results are labelled "Demo / Baseline Analysis".
* `DEMO_MODE=false` -> attempt to load each trained artefact. Any artefact that
  is missing or fails to load falls back to its baseline **and says so** in
  `/api/v1/system/models`, so the platform still runs end-to-end.

The registry is a process-level singleton; `reset_registry()` exists for tests.
"""

from __future__ import annotations

import threading
from typing import Any

from app.config import settings
from app.core.enums import ModelKind
from app.core.logging_config import get_logger
from app.ml.base import (
    FoodClassificationModel,
    FreshnessModel,
    ShelfLifeModel,
    SpoilageDetectionModel,
)
from app.ml.freshness.baseline import BaselineFreshnessModel
from app.ml.freshness.cnn_model import KerasFreshnessModel
from app.ml.freshness.food_classifier import HeuristicFoodClassifier, SklearnFoodClassifier
from app.ml.freshness.sklearn_model import SklearnFreshnessModel
from app.ml.shelf_life.baseline import BaselineShelfLifeModel
from app.ml.shelf_life.sklearn_model import SklearnShelfLifeModel
from app.ml.spoilage.baseline import OpenCVSpoilageDetector
from app.ml.spoilage.yolo import YoloSpoilageDetector

logger = get_logger("app.ml.registry")


class ModelRegistry:
    """Resolves the active model for each inference role."""

    def __init__(self, demo_mode: bool | None = None) -> None:
        self.demo_mode = settings.DEMO_MODE if demo_mode is None else demo_mode

        # Baselines are always constructed - they are the safety net.
        self._baseline_freshness = BaselineFreshnessModel()
        self._baseline_spoilage = OpenCVSpoilageDetector()
        self._baseline_shelf_life = BaselineShelfLifeModel()
        self._baseline_classifier = HeuristicFoodClassifier()

        self._trained_freshness: SklearnFreshnessModel | None = None
        self._trained_freshness_cnn: KerasFreshnessModel | None = None
        self._trained_spoilage: YoloSpoilageDetector | None = None
        self._trained_shelf_life: SklearnShelfLifeModel | None = None
        self._trained_classifier: SklearnFoodClassifier | None = None

        self._fallback_notes: list[str] = []
        self._loaded = False

    # ------------------------------------------------------------- loading
    def load(self) -> "ModelRegistry":
        """Load trained artefacts when not in demo mode. Never raises."""
        if self._loaded:
            return self
        self._loaded = True

        if self.demo_mode:
            logger.info(
                "DEMO_MODE=true - using transparent baseline inference for all ML roles."
            )
            return self

        logger.info("DEMO_MODE=false - attempting to load trained artefacts from %s",
                    settings.MODEL_PATH)

        candidate = SklearnFreshnessModel()
        if candidate.load():
            self._trained_freshness = candidate
        else:
            self._fallback_notes.append(
                "freshness: no trained artefact loaded, using the CV baseline (training required)"
            )

        candidate_cnn = KerasFreshnessModel()
        if candidate_cnn.load():
            self._trained_freshness_cnn = candidate_cnn

        candidate_spoilage = YoloSpoilageDetector()
        if candidate_spoilage.load():
            self._trained_spoilage = candidate_spoilage
        else:
            self._fallback_notes.append(
                "spoilage: no YOLO checkpoint loaded, using the OpenCV baseline (training required)"
            )

        candidate_shelf = SklearnShelfLifeModel()
        if candidate_shelf.load():
            self._trained_shelf_life = candidate_shelf
        else:
            self._fallback_notes.append(
                "shelf_life: no trained regressor loaded, using the kinetic baseline "
                "(training required)"
            )

        candidate_classifier = SklearnFoodClassifier()
        if candidate_classifier.load():
            self._trained_classifier = candidate_classifier
        else:
            self._fallback_notes.append(
                "food_classification: no trained classifier loaded, using colour priors "
                "(advisory only, training required)"
            )

        return self

    # ------------------------------------------------------------ accessors
    @property
    def freshness(self) -> FreshnessModel:
        if self._trained_freshness_cnn and self._trained_freshness_cnn.is_ready:
            return self._trained_freshness_cnn
        if self._trained_freshness and self._trained_freshness.is_ready:
            return self._trained_freshness
        return self._baseline_freshness

    @property
    def freshness_baseline(self) -> BaselineFreshnessModel:
        """The CV baseline is always available (pipeline safety net)."""
        return self._baseline_freshness

    @property
    def spoilage(self) -> SpoilageDetectionModel:
        if self._trained_spoilage and self._trained_spoilage.is_ready:
            return self._trained_spoilage
        return self._baseline_spoilage

    @property
    def spoilage_baseline(self) -> OpenCVSpoilageDetector:
        """The OpenCV detector is always available (used for overlays)."""
        return self._baseline_spoilage

    @property
    def shelf_life(self) -> ShelfLifeModel:
        if self._trained_shelf_life and self._trained_shelf_life.is_ready:
            return self._trained_shelf_life
        return self._baseline_shelf_life

    @property
    def food_classifier(self) -> FoodClassificationModel:
        if self._trained_classifier and self._trained_classifier.is_ready:
            return self._trained_classifier
        return self._baseline_classifier

    # ----------------------------------------------------------- reporting
    @property
    def any_trained(self) -> bool:
        return any(
            model is not None and model.is_ready
            for model in (
                self._trained_freshness,
                self._trained_freshness_cnn,
                self._trained_spoilage,
                self._trained_shelf_life,
                self._trained_classifier,
            )
        )

    @property
    def all_demo(self) -> bool:
        return not self.any_trained

    def status_summary(self) -> dict[str, Any]:
        if self.demo_mode:
            mode = "demo"
        elif self.any_trained:
            mode = "trained" if not self._fallback_notes else "mixed"
        else:
            mode = "baseline"
        return {
            "mode": mode,
            "demo_mode": self.demo_mode,
            "any_trained": self.any_trained,
        }

    def describe(self) -> dict[str, Any]:
        """Full inventory for `/api/v1/system/models` and the UI honesty banner."""
        roles = {
            "freshness": self.freshness.info.as_dict(),
            "spoilage": self.spoilage.info.as_dict(),
            "shelf_life": self.shelf_life.info.as_dict(),
            "food_classification": self.food_classifier.info.as_dict(),
        }
        trained = [name for name, info in roles.items() if not info["is_demo"]]
        baseline = [name for name, info in roles.items() if info["is_demo"]]
        return {
            **self.status_summary(),
            "model_path": settings.MODEL_PATH,
            "roles": roles,
            "trained_roles": trained,
            "baseline_roles": baseline,
            "fallback_notes": list(self._fallback_notes),
            "disclaimer": (
                "Components listed under 'baseline_roles' are transparent computer-vision "
                "or rule-based estimators. They are NOT trained neural networks and no "
                "accuracy figures are claimed for them. Install trained artefacts in "
                "MODEL_PATH and set DEMO_MODE=false to use learned models."
            ),
        }

    def analysis_label(self) -> str:
        """Short label shown next to every result in the UI."""
        if self.demo_mode or self.all_demo:
            return "Demo AI Analysis (baseline)"
        if self._fallback_notes:
            return "Mixed: trained + baseline components"
        return "Trained Model Prediction"

    def result_kind(self) -> ModelKind:
        if self.demo_mode:
            return ModelKind.DEMO
        return ModelKind.TRAINED if self.any_trained else ModelKind.BASELINE


_registry: ModelRegistry | None = None
_lock = threading.Lock()


def get_registry() -> ModelRegistry:
    """Process-wide registry singleton (lazily loaded)."""
    global _registry
    if _registry is None:
        with _lock:
            if _registry is None:
                _registry = ModelRegistry().load()
    return _registry


def reset_registry() -> None:
    """Drop the cached registry (used by tests that flip DEMO_MODE)."""
    global _registry
    with _lock:
        _registry = None
