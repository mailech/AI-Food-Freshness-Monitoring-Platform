"""Train the freshness classifier.

    python ml/training/train_freshness.py --data ml/datasets/freshness

Expected dataset layout (one directory per class):

    ml/datasets/freshness/
      fresh/          *.jpg
      good/           *.jpg
      acceptable/     *.jpg
      near_spoilage/  *.jpg
      spoiled/        *.jpg

Two-class datasets (`fresh/` + `rotten/`, which is what most public sets
provide) are supported and mapped onto the platform's five bands - the mapping
is printed so the limitation is explicit.

The script:
  1. discovers labelled images
  2. extracts the SAME colour/texture features production uses
  3. splits train/validation/test (stratified)
  4. trains a Random Forest (or Gradient Boosting) with class balancing
  5. evaluates on the held-out test split: accuracy, precision, recall, F1,
     confusion matrix
  6. serialises the model together with the metrics it actually achieved

Nothing is written unless training and evaluation succeed, and the metrics
stored in the artefact are exactly the ones printed here - the API displays
them verbatim and never invents figures.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT / "ml") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "ml"))

import numpy as np  # noqa: E402

from preprocessing.features import (  # noqa: E402
    build_feature_frame,
    feature_names,
    iter_labelled_images,
    matrix_from_frame,
)

ARTEFACT_VERSION = "1.0.0"

# Directory name (lower-cased) -> platform freshness band.
LABEL_ALIASES: dict[str, str] = {
    "fresh": "FRESH",
    "freshfruit": "FRESH",
    "freshvegetable": "FRESH",
    "good": "GOOD",
    "acceptable": "ACCEPTABLE",
    "average": "ACCEPTABLE",
    "near_spoilage": "NEAR_SPOILAGE",
    "nearspoilage": "NEAR_SPOILAGE",
    "stale": "NEAR_SPOILAGE",
    "spoiled": "SPOILED",
    "rotten": "SPOILED",
    "rottenfruit": "SPOILED",
    "rottenvegetable": "SPOILED",
    "mouldy": "SPOILED",
    "moldy": "SPOILED",
}


def normalise_label(raw: str) -> str:
    key = raw.strip().lower().replace(" ", "_").replace("-", "_")
    if key in LABEL_ALIASES:
        return LABEL_ALIASES[key]
    upper = key.upper()
    if upper in {"FRESH", "GOOD", "ACCEPTABLE", "NEAR_SPOILAGE", "SPOILED"}:
        return upper
    # Heuristic fallback for names like "fresh_apples" / "rotten_banana".
    for alias, mapped in LABEL_ALIASES.items():
        if alias in key:
            return mapped
    raise ValueError(
        f"cannot map directory '{raw}' to a freshness band. Rename it to one of "
        "fresh / good / acceptable / near_spoilage / spoiled, or extend "
        "LABEL_ALIASES in this script."
    )


def build_model(kind: str, seed: int):
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    if kind == "gradient_boosting":
        estimator = GradientBoostingClassifier(random_state=seed)
    else:
        estimator = RandomForestClassifier(
            n_estimators=400,
            max_depth=None,
            min_samples_leaf=2,
            # Public freshness datasets are usually imbalanced.
            class_weight="balanced_subsample",
            n_jobs=-1,
            random_state=seed,
        )
    # Scaling is harmless for trees and essential if the estimator is swapped.
    return Pipeline([("scaler", StandardScaler()), ("model", estimator)])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--data", type=Path, default=REPO_ROOT / "ml" / "datasets" / "freshness")
    parser.add_argument(
        "--output",
        type=Path,
        default=REPO_ROOT / "backend" / "app" / "ml" / "models" / "freshness_classifier.joblib",
    )
    parser.add_argument("--metrics-out", type=Path, default=REPO_ROOT / "ml" / "artifacts")
    parser.add_argument(
        "--model", choices=["random_forest", "gradient_boosting"], default="random_forest"
    )
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--val-size", type=float, default=0.15)
    parser.add_argument("--image-size", type=int, default=384)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--cv-folds", type=int, default=0, help="0 disables cross-validation")
    args = parser.parse_args()

    try:
        import joblib
        from sklearn.metrics import (
            accuracy_score,
            classification_report,
            confusion_matrix,
            f1_score,
            precision_score,
            recall_score,
        )
        from sklearn.model_selection import cross_val_score, train_test_split
    except ImportError as exc:
        print(f"ERROR: scikit-learn/joblib are required: {exc}", file=sys.stderr)
        return 2

    print("=" * 74)
    print(" TRAIN FRESHNESS CLASSIFIER")
    print("=" * 74)

    # ---- 1. discover -----------------------------------------------------
    try:
        pairs = iter_labelled_images(args.data)
    except FileNotFoundError as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        print(
            "\nTRAINING REQUIRED: no dataset is present. The platform keeps working\n"
            "on its transparent baseline until an artefact exists. See\n"
            "ml/datasets/README.md for how to obtain a dataset legally.",
            file=sys.stderr,
        )
        return 1

    normalised: list[tuple[Path, str]] = []
    mapping_used: dict[str, str] = {}
    for path, raw_label in pairs:
        band = normalise_label(raw_label)
        mapping_used[raw_label] = band
        normalised.append((path, band))

    print(f"\nDataset: {args.data}")
    print(f"Images:  {len(normalised)}")
    print("Label mapping:")
    for raw, band in sorted(mapping_used.items()):
        print(f"  {raw:<22} -> {band}")

    classes = sorted({label for _, label in normalised})
    if len(classes) < 2:
        print("\nERROR: at least two classes are required to train.", file=sys.stderr)
        return 1
    if len(classes) < 5:
        print(
            f"\nNOTE: the dataset covers {len(classes)} of the 5 freshness bands "
            f"({', '.join(classes)}).\n"
            "      The model can only ever predict those bands. This limitation is\n"
            "      recorded in the artefact and shown in the UI.",
        )

    # ---- 2. features -----------------------------------------------------
    print("\nExtracting production features...")
    frame = build_feature_frame(normalised, target_size=args.image_size)
    names = feature_names(
        {c: 0.0 for c in frame.columns if not c.startswith("__")}
    )
    features, labels = matrix_from_frame(frame, names)
    print(f"Feature matrix: {features.shape[0]} samples x {features.shape[1]} features")

    counts = {label: int((labels == label).sum()) for label in classes}
    print(f"Class distribution: {counts}")
    if min(counts.values()) < 5:
        print(
            "\nWARNING: at least one class has fewer than 5 samples. Metrics from\n"
            "         such a split are not meaningful - collect more data.",
        )

    # ---- 3. split --------------------------------------------------------
    x_train_full, x_test, y_train_full, y_test = train_test_split(
        features, labels, test_size=args.test_size, random_state=args.seed, stratify=labels
    )
    validation_fraction = args.val_size / (1.0 - args.test_size)
    x_train, x_val, y_train, y_val = train_test_split(
        x_train_full,
        y_train_full,
        test_size=validation_fraction,
        random_state=args.seed,
        stratify=y_train_full,
    )
    print(f"\nSplit: train={len(y_train)} val={len(y_val)} test={len(y_test)}")

    # ---- 4. train --------------------------------------------------------
    print(f"\nTraining {args.model}...")
    pipeline = build_model(args.model, args.seed)
    pipeline.fit(x_train, y_train)

    val_accuracy = accuracy_score(y_val, pipeline.predict(x_val))
    print(f"Validation accuracy: {val_accuracy:.4f}")

    if args.cv_folds and args.cv_folds > 1:
        folds = min(args.cv_folds, min(counts.values()))
        if folds > 1:
            scores = cross_val_score(pipeline, x_train_full, y_train_full, cv=folds, n_jobs=-1)
            print(f"{folds}-fold CV accuracy: {scores.mean():.4f} (+/- {scores.std():.4f})")

    # ---- 5. evaluate on the held-out test split --------------------------
    print("\n" + "-" * 74)
    print(" TEST-SET EVALUATION (these are the metrics stored in the artefact)")
    print("-" * 74)
    predictions = pipeline.predict(x_test)

    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision_macro": float(precision_score(y_test, predictions, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, predictions, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, predictions, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_test, predictions, average="weighted", zero_division=0)),
        "recall_weighted": float(recall_score(y_test, predictions, average="weighted", zero_division=0)),
        "f1_weighted": float(f1_score(y_test, predictions, average="weighted", zero_division=0)),
        "validation_accuracy": float(val_accuracy),
    }
    for key, value in metrics.items():
        print(f"  {key:<22} {value:.4f}")

    print("\nPer-class report:")
    print(classification_report(y_test, predictions, zero_division=0))

    matrix = confusion_matrix(y_test, predictions, labels=classes)
    print("Confusion matrix (rows = true, cols = predicted):")
    header = "            " + "".join(f"{c[:9]:>11}" for c in classes)
    print(header)
    for label, row in zip(classes, matrix, strict=False):
        print(f"{label[:11]:<12}" + "".join(f"{int(v):>11}" for v in row))

    # ---- 6. serialise ----------------------------------------------------
    model = pipeline.named_steps["model"]
    importances = {}
    if hasattr(model, "feature_importances_"):
        ranked = sorted(
            zip(names, model.feature_importances_, strict=False), key=lambda kv: -kv[1]
        )
        importances = {name: float(value) for name, value in ranked[:25]}
        print("\nTop 10 features by importance:")
        for name, value in ranked[:10]:
            print(f"  {name:<28} {value:.4f}")

    bundle = {
        "model": pipeline,
        "feature_names": names,
        "classes": list(pipeline.classes_),
        "metrics": metrics,
        "confusion_matrix": matrix.tolist(),
        "confusion_matrix_labels": classes,
        "feature_importances": importances,
        "trained_on": (
            f"{args.data.name}: {len(normalised)} images, {len(classes)} classes "
            f"({', '.join(classes)})"
        ),
        "version": ARTEFACT_VERSION,
        "trained_at": datetime.now(UTC).isoformat(),
        "estimator": args.model,
        "image_size": args.image_size,
        "seed": args.seed,
        "limitations": (
            "Trained on the dataset named above only. Metrics come from a single "
            "stratified held-out test split; they describe performance on data like "
            "the training set and should not be extrapolated to other foods, "
            "lighting conditions or cameras."
        ),
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, args.output)
    print(f"\nArtefact written: {args.output}")

    args.metrics_out.mkdir(parents=True, exist_ok=True)
    metrics_path = args.metrics_out / "freshness_metrics.json"
    metrics_path.write_text(
        json.dumps(
            {
                "model": "freshness_classifier",
                "estimator": args.model,
                "metrics": metrics,
                "confusion_matrix": matrix.tolist(),
                "labels": classes,
                "class_counts": counts,
                "trained_on": bundle["trained_on"],
                "trained_at": bundle["trained_at"],
                "limitations": bundle["limitations"],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Metrics written:  {metrics_path}")

    print("\n" + "=" * 74)
    print(" Set DEMO_MODE=false and restart the API (or POST")
    print(" /api/v1/admin/system/reload-models) to serve this model.")
    print("=" * 74)
    return 0


if __name__ == "__main__":
    sys.exit(main())
