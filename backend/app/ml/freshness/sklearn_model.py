"""Trained freshness classifier (scikit-learn artefact).

Loads an artefact produced by `ml/training/train_freshness.py`. The artefact is a
joblib bundle::

    {
        "model":        fitted sklearn estimator (predict_proba capable),
        "feature_names": ordered list of feature keys,
        "classes":      list of FreshnessCategory values in model order,
        "metrics":      dict of metrics from the evaluation split,
        "trained_on":   dataset description string,
        "version":      artefact version string,
    }

Metrics are reported verbatim from the training run - the platform never invents
them. If the artefact carries no metrics, none are displayed.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.core.enums import FreshnessCategory, ModelKind
from app.core.logging_config import get_logger
from app.ml.base import FreshnessModel, FreshnessPrediction, ModelInfo
from app.ml.freshness.baseline import score_to_category

logger = get_logger("app.ml.freshness.trained")

# Score attributed to each class when converting a class back to a visual score.
_CLASS_SCORE: dict[str, float] = {
    FreshnessCategory.FRESH.value: 95.0,
    FreshnessCategory.GOOD.value: 82.0,
    FreshnessCategory.ACCEPTABLE.value: 67.0,
    FreshnessCategory.NEAR_SPOILAGE.value: 45.0,
    FreshnessCategory.SPOILED.value: 14.0,
}


class SklearnFreshnessModel(FreshnessModel):
    """Feature-based freshness classifier backed by a trained sklearn estimator."""

    NAME = "sklearn-freshness"

    def __init__(self, artefact_path: str | None = None) -> None:
        self._path = Path(
            artefact_path or (Path(settings.MODEL_PATH) / settings.FRESHNESS_MODEL_FILE)
        )
        self._model: Any | None = None
        self._feature_names: list[str] = []
        self._classes: list[str] = []
        self._metrics: dict[str, float] = {}
        self._trained_on: str | None = None
        self._version = "unavailable"
        self._loaded = False

    # ---------------------------------------------------------- lifecycle
    @property
    def info(self) -> ModelInfo:
        if self._loaded:
            return ModelInfo(
                name=self.NAME,
                version=self._version,
                kind=ModelKind.TRAINED,
                description=(
                    "Trained scikit-learn freshness classifier over colour/texture "
                    "features. Metrics below are those recorded by the training run."
                ),
                is_demo=False,
                artefact_path=str(self._path),
                trained_on=self._trained_on,
                metrics=self._metrics,
            )
        return ModelInfo(
            name=self.NAME,
            version="unavailable",
            kind=ModelKind.BASELINE,
            description=(
                "No trained freshness artefact installed. Training required - see "
                "ml/training/train_freshness.py. Falling back to the CV baseline."
            ),
            is_demo=True,
            artefact_path=str(self._path),
        )

    def load(self) -> bool:
        if self._loaded:
            return True
        if not self._path.exists():
            logger.info("Freshness artefact not found at %s - using baseline.", self._path)
            return False
        try:
            import joblib  # noqa: PLC0415 - local import keeps startup light

            bundle = joblib.load(self._path)
            if not isinstance(bundle, dict) or "model" not in bundle:
                raise ValueError("artefact is not a recognised bundle dict")
            self._model = bundle["model"]
            self._feature_names = list(bundle.get("feature_names") or [])
            self._classes = [str(c) for c in (bundle.get("classes") or [])] or [
                c.value for c in FreshnessCategory
            ]
            self._metrics = {k: float(v) for k, v in (bundle.get("metrics") or {}).items()}
            self._trained_on = bundle.get("trained_on")
            self._version = str(bundle.get("version") or "1.0.0")
            self._loaded = True
            logger.info(
                "Loaded trained freshness model %s (%d features, %d classes)",
                self._path.name, len(self._feature_names), len(self._classes),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to load freshness artefact %s: %s", self._path, exc)
            self._loaded = False
        return self._loaded

    @property
    def is_ready(self) -> bool:
        return self._loaded and self._model is not None

    # ---------------------------------------------------------- inference
    def _vectorise(self, features: dict[str, float]) -> np.ndarray:
        names = self._feature_names or sorted(features)
        row = [float(features.get(name, 0.0) or 0.0) for name in names]
        return np.asarray([row], dtype=np.float64)

    def predict(
        self,
        features: dict[str, float],
        *,
        category_slug: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> FreshnessPrediction:
        if not self.is_ready:  # pragma: no cover - guarded by the registry
            raise RuntimeError("Trained freshness model is not loaded.")

        matrix = self._vectorise(features)
        if hasattr(self._model, "predict_proba"):
            probabilities = np.asarray(self._model.predict_proba(matrix))[0]
            classes = [str(c) for c in getattr(self._model, "classes_", self._classes)]
        else:  # pragma: no cover - estimators without probabilities
            predicted = str(self._model.predict(matrix)[0])
            classes = self._classes
            probabilities = np.array([1.0 if c == predicted else 0.0 for c in classes])

        best_index = int(np.argmax(probabilities))
        label = classes[best_index]
        category = FreshnessCategory.parse(label, FreshnessCategory.ACCEPTABLE)
        prob_map = {
            str(FreshnessCategory.parse(c, FreshnessCategory.ACCEPTABLE)): float(p)
            for c, p in zip(classes, probabilities, strict=False)
        }

        # Expected-value visual score across the predicted distribution.
        visual_score = float(
            sum(_CLASS_SCORE.get(cls, 60.0) * prob for cls, prob in prob_map.items())
        )
        category = FreshnessCategory.parse(label, score_to_category(visual_score))

        top_probability = float(probabilities[best_index])
        # Margin between the top two classes is a useful confidence proxy.
        ordered = np.sort(probabilities)[::-1]
        margin = float(ordered[0] - ordered[1]) if ordered.size > 1 else 1.0
        confidence = float(np.clip(0.55 * top_probability + 0.45 * (0.5 + margin / 2), 0.3, 0.99))

        return FreshnessPrediction(
            freshness_category=category,
            freshness_probability=top_probability,
            confidence=confidence,
            visual_score=visual_score,
            detected_indicators=[
                f"Trained model classified this item as {category} "
                f"({top_probability:.0%} class probability)"
            ],
            class_probabilities={k: round(v, 4) for k, v in prob_map.items()},
            features={"expected_visual_score": round(visual_score, 2), "class_margin": round(margin, 4)},
            model_info=self.info,
            notes="Trained model prediction.",
        )
