"""Food classification / category identification.

Two implementations:

* `HeuristicFoodClassifier` - a colour-prior baseline. It is deliberately weak
  and honest about it: colour alone cannot distinguish a tomato from a red
  pepper. It exists so the pipeline stage is present and testable, and it is
  never used to override a user-declared product category.
* `SklearnFoodClassifier`   - loads an artefact trained on a real dataset
  (e.g. Food-101 for category identification, see ml/datasets/README.md).

The analysis service always *prefers the product's declared category* and treats
classification output as advisory metadata.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.core.enums import ModelKind
from app.core.logging_config import get_logger
from app.ml.base import FoodClassification, FoodClassificationModel, ModelInfo

logger = get_logger("app.ml.food_classifier")

# Very coarse colour priors -> candidate category. Advisory only.
_COLOR_PRIORS: list[tuple[str, str, tuple[float, float], float]] = [
    # (label, category_slug, (hue_low, hue_high), saturation_floor)
    ("Leafy / green produce", "VEGETABLES", (35.0, 85.0), 55.0),
    ("Citrus / yellow-orange produce", "FRUITS", (18.0, 35.0), 70.0),
    ("Red produce or meat", "FRUITS", (0.0, 10.0), 70.0),
    ("Baked / golden-brown item", "BAKERY", (10.0, 25.0), 40.0),
    ("Pale dairy-like item", "DAIRY", (0.0, 180.0), 0.0),
]


class HeuristicFoodClassifier(FoodClassificationModel):
    NAME = "colour-prior-food-classifier"
    VERSION = "0.9.0"

    @property
    def info(self) -> ModelInfo:
        return ModelInfo(
            name=self.NAME,
            version=self.VERSION,
            kind=ModelKind.BASELINE,
            description=(
                "Colour-prior heuristic for coarse food-family hints. Intentionally "
                "low-confidence: it cannot reliably identify a specific food. Advisory "
                "only - the product's declared category always wins."
            ),
            is_demo=True,
            metrics={},
        )

    def classify(
        self, image: np.ndarray, features: dict[str, float] | None = None
    ) -> FoodClassification:
        feats = features or {}
        hue = float(feats.get("mean_hue", 30.0))
        sat = float(feats.get("mean_saturation", 90.0))

        scored: list[tuple[str, str, float]] = []
        for label, slug, (low, high), sat_floor in _COLOR_PRIORS:
            if low <= hue <= high and sat >= sat_floor:
                span = max(1.0, high - low)
                centrality = 1.0 - abs(hue - (low + high) / 2.0) / (span / 2.0)
                score = float(np.clip(0.20 + centrality * 0.28, 0.05, 0.52))
                scored.append((label, slug, score))

        if not scored:
            scored = [("Unrecognised food item", "GENERIC", 0.12)]
        scored.sort(key=lambda item: -item[2])
        label, slug, score = scored[0]

        return FoodClassification(
            label=label,
            category_slug=slug,
            confidence=score,
            top_k=[(l, s) for l, _, s in scored[:3]],
            model_info=self.info,
        )


class SklearnFoodClassifier(FoodClassificationModel):
    """Trained food classifier loaded from a joblib bundle."""

    NAME = "sklearn-food-classifier"

    def __init__(self, artefact_path: str | None = None) -> None:
        self._path = Path(
            artefact_path or (Path(settings.MODEL_PATH) / settings.FOOD_CLASSIFIER_MODEL_FILE)
        )
        self._model: Any | None = None
        self._feature_names: list[str] = []
        self._label_to_slug: dict[str, str] = {}
        self._metrics: dict[str, float] = {}
        self._trained_on: str | None = None
        self._version = "unavailable"
        self._loaded = False

    @property
    def info(self) -> ModelInfo:
        if self._loaded:
            return ModelInfo(
                name=self.NAME,
                version=self._version,
                kind=ModelKind.TRAINED,
                description="Trained food classifier loaded from a local artefact.",
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
                "No trained food classifier installed. Training required - see "
                "ml/training/train_food_classifier.py."
            ),
            is_demo=True,
            artefact_path=str(self._path),
        )

    def load(self) -> bool:
        if self._loaded:
            return True
        if not self._path.exists():
            return False
        try:
            import joblib  # noqa: PLC0415

            bundle = joblib.load(self._path)
            self._model = bundle["model"]
            self._feature_names = list(bundle.get("feature_names") or [])
            self._label_to_slug = dict(bundle.get("label_to_slug") or {})
            self._metrics = {k: float(v) for k, v in (bundle.get("metrics") or {}).items()}
            self._trained_on = bundle.get("trained_on")
            self._version = str(bundle.get("version") or "1.0.0")
            self._loaded = True
            logger.info("Loaded trained food classifier %s", self._path.name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to load food classifier %s: %s", self._path, exc)
            self._loaded = False
        return self._loaded

    @property
    def is_ready(self) -> bool:
        return self._loaded and self._model is not None

    def classify(
        self, image: np.ndarray, features: dict[str, float] | None = None
    ) -> FoodClassification:
        if not self.is_ready:  # pragma: no cover
            raise RuntimeError("Trained food classifier is not loaded.")
        feats = features or {}
        names = self._feature_names or sorted(feats)
        row = np.asarray([[float(feats.get(n, 0.0) or 0.0) for n in names]], dtype=np.float64)

        if hasattr(self._model, "predict_proba"):
            probabilities = np.asarray(self._model.predict_proba(row))[0]
            classes = [str(c) for c in self._model.classes_]
        else:  # pragma: no cover
            predicted = str(self._model.predict(row)[0])
            classes = [predicted]
            probabilities = np.array([1.0])

        order = np.argsort(probabilities)[::-1]
        top = [(classes[i], float(probabilities[i])) for i in order[:3]]
        label, score = top[0]
        return FoodClassification(
            label=label,
            category_slug=self._label_to_slug.get(label, "GENERIC"),
            confidence=score,
            top_k=top,
            model_info=self.info,
        )
