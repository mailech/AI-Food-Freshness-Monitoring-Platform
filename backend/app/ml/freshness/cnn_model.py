"""Trained CNN freshness classifier (Keras / TensorFlow artefact).

Adapter that plugs a raw-image CNN into the platform's feature-oriented
``FreshnessModel`` contract. The platform's freshness role normally receives an
extracted feature dict, but a CNN needs pixels, so this adapter reads the
prepared RGB image out of the ``context`` the analyzer passes in
(``context["image_rgb"]``) and runs the network on it.

Expected artefact
-----------------
* ``<MODEL_PATH>/freshness_cnn.keras`` - a Keras model whose input is an
  ``(H, W, 3)`` RGB image and whose output is a softmax over N freshness
  classes. Preprocessing (rescale / normalise) is assumed to be baked into the
  model graph; pixels are fed in the ``[0, 255]`` range.
* Optional sidecar ``freshness_cnn.labels.json`` (same stem) describing the
  class labels, per-index freshness score and expected input size. If absent,
  sensible defaults are used and the mapping is reported as unverified.

TensorFlow is imported lazily so it never slows startup when the CNN is unused.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.core.enums import FreshnessCategory, ModelKind
from app.core.logging_config import get_logger
from app.ml.base import FreshnessModel, FreshnessPrediction, ModelInfo
from app.ml.freshness.baseline import score_to_category

logger = get_logger("app.ml.freshness.cnn")

# Default per-index visual score when no sidecar mapping is supplied. Assumes the
# class order runs from freshest to most spoiled; edit the sidecar to change it.
_DEFAULT_SCORES = [95.0, 80.0, 62.0, 45.0, 25.0, 10.0]


class KerasFreshnessModel(FreshnessModel):
    """Feature-agnostic freshness classifier backed by a trained Keras CNN."""

    NAME = "keras-cnn-freshness"

    def __init__(self, artefact_path: str | None = None) -> None:
        self._path = Path(
            artefact_path or (Path(settings.MODEL_PATH) / settings.FRESHNESS_CNN_FILE)
        )
        self._labels_path = self._path.with_suffix("").with_suffix(".labels.json")
        self._model: Any | None = None
        self._input_size: tuple[int, int] = (224, 224)
        self._labels: list[str] = []
        self._scores: list[float] = []
        self._is_fresh: list[bool] = []
        self._fresh_score: float = 94.0
        self._rotten_score: float = 12.0
        self._cnn_blend_weight: float = 0.5
        self._version = "unavailable"
        self._trained_on: str | None = None
        self._metrics: dict[str, float] = {}
        self._labels_verified = False
        self._loaded = False

    # ---------------------------------------------------------- lifecycle
    @property
    def info(self) -> ModelInfo:
        if self._loaded:
            note = (
                "Trained Keras CNN freshness classifier (raw-image input). "
                + (
                    "Class-to-band mapping loaded from sidecar."
                    if self._labels_verified
                    else "Class-to-band mapping is a placeholder - edit the "
                    "freshness_cnn.labels.json sidecar to match your dataset."
                )
            )
            return ModelInfo(
                name=self.NAME,
                version=self._version,
                kind=ModelKind.TRAINED,
                description=note,
                is_demo=False,
                artefact_path=str(self._path),
                trained_on=self._trained_on,
                metrics=self._metrics,
            )
        return ModelInfo(
            name=self.NAME,
            version="unavailable",
            kind=ModelKind.BASELINE,
            description="No Keras freshness CNN installed; falling back to the CV baseline.",
            is_demo=True,
            artefact_path=str(self._path),
        )

    def _load_sidecar(self) -> None:
        if not self._labels_path.exists():
            self._scores = list(_DEFAULT_SCORES)
            return
        try:
            meta = json.loads(self._labels_path.read_text(encoding="utf-8"))
            self._labels = [str(x) for x in (meta.get("labels") or [])]
            self._scores = [float(x) for x in (meta.get("freshness_score") or [])]
            self._is_fresh = [bool(x) for x in (meta.get("is_fresh") or [])]
            if "fresh_score" in meta:
                self._fresh_score = float(meta["fresh_score"])
            if "rotten_score" in meta:
                self._rotten_score = float(meta["rotten_score"])
            if "cnn_blend_weight" in meta:
                self._cnn_blend_weight = float(np.clip(float(meta["cnn_blend_weight"]), 0.0, 1.0))
            size = meta.get("input", {}).get("size")
            if isinstance(size, (list, tuple)) and len(size) == 2:
                self._input_size = (int(size[0]), int(size[1]))
            self._version = str(meta.get("version") or "cnn-1.0.0")
            self._trained_on = meta.get("trained_on")
            self._metrics = {k: float(v) for k, v in (meta.get("metrics") or {}).items()}
            self._labels_verified = bool(self._labels) and not any(
                l.startswith("class_") for l in self._labels
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to read CNN sidecar %s: %s", self._labels_path, exc)
            self._scores = list(_DEFAULT_SCORES)

    def load(self) -> bool:
        if self._loaded:
            return True
        if not self._path.exists():
            logger.info("Keras freshness artefact not found at %s - using baseline.", self._path)
            return False
        try:
            import keras  # noqa: PLC0415 - heavy import kept lazy

            self._model = keras.models.load_model(str(self._path), compile=False)
            self._load_sidecar()

            # Derive #classes / input size from the graph when possible.
            try:
                out_units = int(self._model.outputs[0].shape[-1])
                in_shape = self._model.inputs[0].shape
                if in_shape[1] and in_shape[2]:
                    self._input_size = (int(in_shape[1]), int(in_shape[2]))
            except Exception:  # noqa: BLE001
                out_units = len(self._scores) or 6

            # Reconcile the score table with the actual class count.
            if len(self._scores) != out_units:
                if len(self._scores) > out_units:
                    self._scores = self._scores[:out_units]
                else:
                    # Spread evenly from fresh (100) to spoiled (5).
                    self._scores = list(
                        np.linspace(100.0, 5.0, num=out_units)
                    )
                    self._labels_verified = False
            if not self._labels:
                self._labels = [f"class_{i}" for i in range(out_units)]

            self._version = self._version if self._version != "unavailable" else "cnn-1.0.0"
            self._loaded = True
            logger.info(
                "Loaded Keras freshness CNN %s (input=%s, %d classes, mapping %s)",
                self._path.name,
                self._input_size,
                len(self._scores),
                "verified" if self._labels_verified else "placeholder",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to load Keras freshness CNN %s: %s", self._path, exc)
            self._loaded = False
        return self._loaded

    @property
    def is_ready(self) -> bool:
        return self._loaded and self._model is not None

    # ---------------------------------------------------------- inference
    def _prepare_image(self, image_rgb: np.ndarray) -> np.ndarray:
        import cv2  # noqa: PLC0415

        h, w = self._input_size
        resized = cv2.resize(image_rgb, (w, h), interpolation=cv2.INTER_AREA)
        arr = resized.astype("float32")  # model expects raw [0,255] RGB
        return arr[np.newaxis, ...]

    def predict(
        self,
        features: dict[str, float],
        *,
        category_slug: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> FreshnessPrediction:
        if not self.is_ready:  # pragma: no cover - guarded by the registry
            raise RuntimeError("Keras freshness CNN is not loaded.")

        image_rgb = (context or {}).get("image_rgb")
        if image_rgb is None:
            # The CNN cannot run without pixels; signal the registry-level fallback.
            raise RuntimeError("KerasFreshnessModel requires context['image_rgb'].")

        batch = self._prepare_image(np.asarray(image_rgb))
        probs = np.asarray(self._model.predict(batch, verbose=0))[0].astype(float)
        probs = probs / (probs.sum() or 1.0)

        best_index = int(np.argmax(probs))
        top_probability = float(probs[best_index])
        prob_map = {self._labels[i]: float(probs[i]) for i in range(len(probs))}

        # ---- universal fresh-vs-rotten reduction ----------------------
        # The model is a 6-way fruit classifier, but we apply it to ANY edible
        # item by collapsing its classes into two groups (fresh / rotten) and
        # scoring on the aggregate probability of freshness. This makes the
        # detected state food-agnostic instead of reporting a specific fruit.
        if self._is_fresh and len(self._is_fresh) == len(probs):
            fresh_mask = np.asarray(self._is_fresh, dtype=bool)
            p_fresh = float(probs[fresh_mask].sum())
            p_rotten = float(probs[~fresh_mask].sum())
            # CNN's own score: interpolate by how fresh the CNN thinks it is.
            cnn_score = float(
                np.clip(self._rotten_score + p_fresh * (self._fresh_score - self._rotten_score),
                        0.0, 100.0)
            )

            # CV score from the platform's measured colour/texture descriptors.
            # These already sit in the features dict (0..100 each). Blending them
            # in makes the predicted value track the actual look of each item -
            # important because the CNN only ever saw three fruits.
            color_cv = float(features.get("color_degradation_score", cnn_score))
            texture_cv = float(features.get("texture_condition_score", cnn_score))
            cv_score = float(np.clip(0.6 * color_cv + 0.4 * texture_cv, 0.0, 100.0))

            w = self._cnn_blend_weight
            visual_score = float(np.clip(w * cnn_score + (1.0 - w) * cv_score, 0.0, 100.0))

            is_fresh_call = p_fresh >= p_rotten
            state_label = "fresh" if is_fresh_call else "rotten/spoiled"
            state_probability = p_fresh if is_fresh_call else p_rotten
            indicator = (
                f"CNN assessed this item as {state_label} "
                f"(P(fresh)={p_fresh:.0%}); score blends CNN {cnn_score:.0f} "
                f"with measured visual {cv_score:.0f}"
            )
            confidence = float(np.clip(0.5 + abs(p_fresh - p_rotten) / 2.0, 0.3, 0.99))
            reduction_features = {
                "cnn_p_fresh": round(p_fresh, 4),
                "cnn_p_rotten": round(p_rotten, 4),
                "cnn_score": round(cnn_score, 2),
                "cv_score": round(cv_score, 2),
                "cnn_blend_weight": round(w, 3),
            }
        else:
            # Fallback: per-class expected-value score.
            scores = np.asarray(self._scores[: len(probs)], dtype=float)
            visual_score = float(np.clip(float(np.dot(probs, scores)), 0.0, 100.0))
            ordered = np.sort(probs)[::-1]
            margin = float(ordered[0] - ordered[1]) if ordered.size > 1 else 1.0
            confidence = float(
                np.clip(0.55 * top_probability + 0.45 * (0.5 + margin / 2), 0.3, 0.99)
            )
            state_probability = top_probability
            indicator = (
                f"CNN classified this item as '{self._labels[best_index]}' "
                f"({top_probability:.0%} class probability)"
            )
            reduction_features = {"class_margin": round(margin, 4)}

        category = score_to_category(visual_score)

        return FreshnessPrediction(
            freshness_category=category,
            freshness_probability=state_probability,
            confidence=confidence,
            visual_score=visual_score,
            detected_indicators=[indicator],
            class_probabilities={k: round(v, 4) for k, v in prob_map.items()},
            features={
                "expected_visual_score": round(visual_score, 2),
                "closest_class": best_index,
                **reduction_features,
            },
            model_info=self.info,
            notes=(
                "Trained CNN fresh/rotten assessment applied to all edible items. "
                "The model was trained on fruit images, so results for non-fruit foods "
                "are an approximate visual cue."
            ),
        )
