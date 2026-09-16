"""Trained shelf-life regressor (scikit-learn / XGBoost artefact).

Loads a bundle produced by `ml/training/train_shelf_life.py`::

    {
        "model":         fitted regressor,
        "feature_names": ordered numeric feature keys,
        "categorical":   {"category_slug": [...], "packaging_type": [...]} for one-hot,
        "metrics":       {"mae": .., "rmse": .., "r2": ..},   # from the test split
        "trained_on":    dataset description,
        "version":       artefact version,
    }

Metrics are only ever those recorded during that evaluation run.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.core.category_rules import get_profile
from app.core.enums import ModelKind
from app.core.logging_config import get_logger
from app.ml.base import ModelInfo, ShelfLifeModel, ShelfLifePredictionResult
from app.ml.shelf_life.baseline import _risk_level  # shared risk banding

logger = get_logger("app.ml.shelf_life.trained")


class SklearnShelfLifeModel(ShelfLifeModel):
    NAME = "sklearn-shelf-life"

    def __init__(self, artefact_path: str | None = None) -> None:
        self._path = Path(
            artefact_path or (Path(settings.MODEL_PATH) / settings.SHELF_LIFE_MODEL_FILE)
        )
        self._model: Any | None = None
        self._feature_names: list[str] = []
        self._categorical: dict[str, list[str]] = {}
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
                    "Trained regression model for remaining shelf life. MAE/RMSE/R2 below "
                    "are the values recorded on the held-out test split during training."
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
                "No trained shelf-life artefact installed. Training required - see "
                "ml/training/train_shelf_life.py. Falling back to the kinetic baseline."
            ),
            is_demo=True,
            artefact_path=str(self._path),
        )

    def load(self) -> bool:
        if self._loaded:
            return True
        if not self._path.exists():
            logger.info("Shelf-life artefact not found at %s - using baseline.", self._path)
            return False
        try:
            import joblib  # noqa: PLC0415

            bundle = joblib.load(self._path)
            self._model = bundle["model"]
            self._feature_names = list(bundle.get("feature_names") or [])
            self._categorical = {
                key: [str(v) for v in values]
                for key, values in (bundle.get("categorical") or {}).items()
            }
            self._metrics = {k: float(v) for k, v in (bundle.get("metrics") or {}).items()}
            self._trained_on = bundle.get("trained_on")
            self._version = str(bundle.get("version") or "1.0.0")
            self._loaded = True
            logger.info("Loaded trained shelf-life model %s", self._path.name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to load shelf-life artefact %s: %s", self._path, exc)
            self._loaded = False
        return self._loaded

    @property
    def is_ready(self) -> bool:
        return self._loaded and self._model is not None

    # ---------------------------------------------------------- inference
    def _vectorise(self, features: dict[str, Any]) -> np.ndarray:
        row: list[float] = [
            float(features.get(name) or 0.0) for name in self._feature_names
        ]
        for key, levels in self._categorical.items():
            value = str(features.get(key) or "")
            row.extend(1.0 if value == level else 0.0 for level in levels)
        return np.asarray([row], dtype=np.float64)

    def predict(self, features: dict[str, Any]) -> ShelfLifePredictionResult:
        if not self.is_ready:  # pragma: no cover
            raise RuntimeError("Trained shelf-life model is not loaded.")

        matrix = self._vectorise(features)
        remaining = float(self._model.predict(matrix)[0])
        remaining = float(max(0.0, round(remaining, 2)))

        declared = features.get("declared_remaining_days")
        capped = False
        if declared is not None and remaining > float(declared):
            remaining = float(declared)
            capped = True

        # Interval derived from the model's own test MAE when available.
        mae = self._metrics.get("mae")
        spread = (mae if mae else max(0.5, remaining * 0.25))
        lower = max(0.0, remaining - spread)
        upper = remaining + spread

        r2 = self._metrics.get("r2")
        confidence = float(np.clip(0.5 + (r2 or 0.0) * 0.45, 0.3, 0.95))

        profile = get_profile(features.get("category_slug"))
        risk = _risk_level(remaining, profile.perishability)

        explanation = (
            f"Trained model prediction ({self._version}): {remaining:.1f} day(s) remaining"
            + (f", interval +/-{spread:.1f} days from the recorded test MAE" if mae else "")
            + (". Capped by the declared expiry date." if capped else ".")
        )

        return ShelfLifePredictionResult(
            remaining_days=remaining,
            confidence=confidence,
            risk_level=risk,
            lower_bound_days=round(lower, 2),
            upper_bound_days=round(upper, 2),
            factors={"model_r2": r2 or 0.0, "model_mae": mae or 0.0},
            features={k: v for k, v in features.items() if v is not None},
            explanation=explanation,
            model_info=self.info,
        )
