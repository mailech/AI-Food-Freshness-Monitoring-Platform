"""Feature extraction for training.

Reuses the *exact* production feature extractors from `backend/app/ml` so a
model trained here sees the same inputs at inference time. This is the single
most important property of the training pipeline: if training and serving
computed features differently, the reported metrics would be meaningless.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make the backend package importable without installing it.
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from app.ml.image_analysis.color import analyze_color, color_degradation_score  # noqa: E402
from app.ml.image_analysis.texture import analyze_texture, texture_condition_score  # noqa: E402
from app.ml.preprocessing.image_ops import prepare  # noqa: E402

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def extract_image_features(image_path: Path, target_size: int = 384) -> dict[str, float]:
    """Colour + texture descriptors for one image, identical to production."""
    data = image_path.read_bytes()
    prepared = prepare(data, target_size=target_size)

    colour = analyze_color(prepared)
    texture = analyze_texture(prepared)

    features: dict[str, float] = {**colour, **texture}
    features["color_degradation_score"] = color_degradation_score(colour)
    features["texture_condition_score"] = texture_condition_score(texture)
    features["food_pixel_ratio"] = prepared.food_pixel_ratio
    features["aspect_ratio"] = (
        prepared.working_size[0] / max(1, prepared.working_size[1])
    )
    return features


def feature_names(sample_features: dict[str, float]) -> list[str]:
    """Deterministic, sorted feature ordering (must match at inference time)."""
    return sorted(sample_features)


def iter_labelled_images(root: Path) -> list[tuple[Path, str]]:
    """Discover `root/<label>/<image>` pairs.

    Expected layout::

        dataset/
          fresh/      img001.jpg ...
          spoiled/    img101.jpg ...
    """
    if not root.is_dir():
        raise FileNotFoundError(f"dataset directory not found: {root}")

    pairs: list[tuple[Path, str]] = []
    for label_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for image in sorted(label_dir.rglob("*")):
            if image.is_file() and image.suffix.lower() in IMAGE_EXTENSIONS:
                pairs.append((image, label_dir.name))
    if not pairs:
        raise FileNotFoundError(
            f"no images found under {root}. Expected <root>/<label>/<image>.jpg - "
            "see ml/datasets/README.md"
        )
    return pairs


def build_feature_frame(
    pairs: list[tuple[Path, str]],
    *,
    target_size: int = 384,
    progress_every: int = 50,
    logger=print,
) -> pd.DataFrame:
    """Extract features for every (path, label) pair into a DataFrame."""
    rows: list[dict[str, object]] = []
    failures = 0

    for index, (path, label) in enumerate(pairs, start=1):
        try:
            features = extract_image_features(path, target_size=target_size)
        except Exception as exc:  # noqa: BLE001 - skip unreadable files, keep going
            failures += 1
            logger(f"  ! skipped {path.name}: {type(exc).__name__}: {exc}")
            continue
        rows.append({**features, "__label__": label, "__path__": str(path)})

        if progress_every and index % progress_every == 0:
            logger(f"  processed {index}/{len(pairs)} images")

    if not rows:
        raise RuntimeError("no images could be processed - check the dataset")
    if failures:
        logger(f"  {failures} image(s) were skipped")

    frame = pd.DataFrame(rows)
    # Guard against NaN/inf reaching the estimator.
    numeric = frame.select_dtypes(include=[np.number]).columns
    frame[numeric] = frame[numeric].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    return frame


def matrix_from_frame(
    frame: pd.DataFrame, names: list[str]
) -> tuple[np.ndarray, np.ndarray]:
    """`(X, y)` in the given feature order."""
    features = frame.reindex(columns=names, fill_value=0.0).to_numpy(dtype=np.float64)
    labels = frame["__label__"].to_numpy()
    return features, labels
