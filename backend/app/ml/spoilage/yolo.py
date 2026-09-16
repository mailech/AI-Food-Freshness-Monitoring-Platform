"""YOLO-based spoilage object detection (optional, trained path).

STATUS: interface + loader only. **No weights are bundled or downloaded.**

Why: shipping or auto-fetching third-party weights without recording their
provenance and licence would make the project academically indefensible. The
class below loads a *locally supplied* checkpoint that you trained yourself (see
`ml/training/train_spoilage.py`) or obtained deliberately and documented.

Behaviour
---------
* `load()` returns False when ultralytics or the checkpoint file is missing.
* `is_ready` is then False and `ModelRegistry` keeps using the OpenCV baseline.
* When a checkpoint *is* present, detections are mapped onto the platform's
  `SpoilageIndicatorType` vocabulary via `CLASS_MAP`.

Training your own weights
-------------------------
1. Obtain a licensed dataset with spoilage bounding boxes (see
   `ml/datasets/README.md`).
2. `python ml/training/train_spoilage.py --data ml/datasets/spoilage/data.yaml`
3. Copy `best.pt` to `backend/app/ml/models/spoilage_yolo.pt`
4. Set `DEMO_MODE=false` and restart the API.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from app.config import settings
from app.core.enums import ModelKind, SpoilageIndicatorType
from app.core.logging_config import get_logger
from app.ml.base import (
    DetectedRegion,
    ModelInfo,
    SpoilageDetectionModel,
    SpoilageFinding,
    SpoilagePrediction,
)
from app.ml.preprocessing.image_ops import PreparedImage

logger = get_logger("app.ml.spoilage.yolo")

# Maps detector class names to the platform vocabulary.
CLASS_MAP: dict[str, str] = {
    "mold": SpoilageIndicatorType.MOLD.value,
    "mould": SpoilageIndicatorType.MOLD.value,
    "fungus": SpoilageIndicatorType.MOLD.value,
    "bruise": SpoilageIndicatorType.BRUISING.value,
    "bruising": SpoilageIndicatorType.BRUISING.value,
    "rot": SpoilageIndicatorType.DISCOLORATION.value,
    "rotten": SpoilageIndicatorType.DISCOLORATION.value,
    "discoloration": SpoilageIndicatorType.DISCOLORATION.value,
    "discolouration": SpoilageIndicatorType.DISCOLORATION.value,
    "damage": SpoilageIndicatorType.PHYSICAL_DAMAGE.value,
    "crack": SpoilageIndicatorType.PHYSICAL_DAMAGE.value,
    "cut": SpoilageIndicatorType.PHYSICAL_DAMAGE.value,
    "wrinkle": SpoilageIndicatorType.DRYNESS.value,
    "shrivel": SpoilageIndicatorType.DRYNESS.value,
}


class YoloSpoilageDetector(SpoilageDetectionModel):
    """Wraps an ultralytics YOLO checkpoint, if one has been provided."""

    NAME = "yolo-spoilage"

    def __init__(self, weights_path: str | None = None, confidence: float = 0.25) -> None:
        self._weights_path = Path(
            weights_path or (Path(settings.MODEL_PATH) / settings.SPOILAGE_MODEL_FILE)
        )
        self._confidence = confidence
        self._model: Any | None = None
        self._loaded = False
        self._class_names: dict[int, str] = {}
        self._metrics: dict[str, float] = {}

    # ---------------------------------------------------------- lifecycle
    @property
    def info(self) -> ModelInfo:
        if self._loaded:
            return ModelInfo(
                name=self.NAME,
                version="local-checkpoint",
                kind=ModelKind.TRAINED,
                description=(
                    "YOLO object detector loaded from a locally supplied checkpoint. "
                    "Metrics come from your own evaluation run - none are assumed."
                ),
                is_demo=False,
                artefact_path=str(self._weights_path),
                metrics=self._metrics,
            )
        return ModelInfo(
            name=self.NAME,
            version="unavailable",
            kind=ModelKind.BASELINE,
            description=(
                "YOLO detector interface present but no checkpoint is installed. "
                "Training required - see ml/training/train_spoilage.py. The OpenCV "
                "baseline is used instead."
            ),
            is_demo=True,
            artefact_path=str(self._weights_path),
        )

    def load(self) -> bool:
        if self._loaded:
            return True
        if not self._weights_path.exists():
            logger.info(
                "YOLO spoilage checkpoint not found at %s - using the OpenCV baseline.",
                self._weights_path,
            )
            return False
        try:
            from ultralytics import YOLO  # noqa: PLC0415 - optional dependency
        except ImportError:
            logger.info(
                "ultralytics is not installed (pip install -r requirements-ml.txt) - "
                "using the OpenCV baseline."
            )
            return False
        try:
            self._model = YOLO(str(self._weights_path))
            names = getattr(self._model, "names", {}) or {}
            self._class_names = {int(k): str(v) for k, v in dict(names).items()}
            self._loaded = True
            logger.info(
                "Loaded YOLO spoilage checkpoint %s with %d classes",
                self._weights_path.name,
                len(self._class_names),
            )
        except Exception as exc:  # noqa: BLE001 - never break startup on a bad file
            logger.warning("Failed to load YOLO checkpoint %s: %s", self._weights_path, exc)
            self._model = None
            self._loaded = False
        return self._loaded

    @property
    def is_ready(self) -> bool:
        return self._loaded and self._model is not None

    # ---------------------------------------------------------- inference
    def detect(
        self,
        image: PreparedImage | np.ndarray,
        *,
        mask: np.ndarray | None = None,
        category_slug: str | None = None,
        features: dict[str, float] | None = None,
    ) -> SpoilagePrediction:
        if not self.is_ready:  # pragma: no cover - guarded by the registry
            raise RuntimeError("YOLO spoilage detector is not loaded.")

        frame = image.bgr if isinstance(image, PreparedImage) else image
        results = self._model.predict(  # type: ignore[union-attr]
            source=frame, conf=self._confidence, verbose=False
        )

        grouped: dict[str, list[tuple[float, DetectedRegion]]] = {}
        frame_area = float(frame.shape[0] * frame.shape[1]) or 1.0

        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            for box in boxes:
                cls_id = int(box.cls.item())
                score = float(box.conf.item())
                raw_name = self._class_names.get(cls_id, str(cls_id)).lower()
                indicator = CLASS_MAP.get(
                    raw_name, SpoilageIndicatorType.SURFACE_DEGRADATION.value
                )
                x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
                region = DetectedRegion(
                    x=int(x1), y=int(y1),
                    width=int(max(1, x2 - x1)), height=int(max(1, y2 - y1)),
                    score=score,
                )
                grouped.setdefault(indicator, []).append((score, region))

        findings: list[SpoilageFinding] = []
        for indicator, items in grouped.items():
            confidence = max(score for score, _ in items)
            area = sum(r.width * r.height for _, r in items) / frame_area
            findings.append(
                SpoilageFinding(
                    indicator_type=indicator,
                    label=indicator.replace("_", " ").title(),
                    confidence=confidence,
                    severity=(
                        "CRITICAL" if confidence >= 0.8
                        else "HIGH" if confidence >= 0.6
                        else "MEDIUM" if confidence >= 0.4
                        else "LOW"
                    ),
                    affected_area_ratio=float(min(1.0, area)),
                    detected=True,
                    description=f"{len(items)} detection(s) from the trained YOLO model.",
                    regions=[region for _, region in sorted(items, key=lambda t: -t[0])][:6],
                    detector=self.NAME,
                )
            )

        probability = max((f.confidence for f in findings), default=0.02)
        return SpoilagePrediction(
            spoilage_probability=float(min(0.99, probability)),
            findings=findings,
            model_info=self.info,
        )
