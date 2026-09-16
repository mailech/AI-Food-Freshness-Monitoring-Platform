"""Evaluate installed model artefacts.

    python ml/evaluation/evaluate.py                      # report what is installed
    python ml/evaluation/evaluate.py --freshness-data ml/datasets/freshness_holdout

Two modes:

1. **Inventory** (no arguments) - reports which artefacts are installed in
   `backend/app/ml/models/`, and for each one prints the metrics recorded at
   training time. Roles without an artefact are reported as "training required"
   with no metrics, because none exist.

2. **Fresh evaluation** - given a held-out dataset, re-scores the installed
   freshness classifier on data it has never seen and prints accuracy,
   precision, recall, F1 and the confusion matrix.

This script never invents a number. If a metric is not printed, it was not
measured.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
for candidate in (BACKEND_DIR, REPO_ROOT / "ml"):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

MODEL_DIR = BACKEND_DIR / "app" / "ml" / "models"

ARTEFACTS = {
    "freshness": "freshness_classifier.joblib",
    "shelf_life": "shelf_life_regressor.joblib",
    "food_classification": "food_classifier.joblib",
    "spoilage": "spoilage_yolo.pt",
}

TRAINING_COMMANDS = {
    "freshness": "python ml/training/train_freshness.py --data ml/datasets/freshness",
    "shelf_life": "python ml/training/train_shelf_life.py --data ml/datasets/shelf_life/observations.csv",
    "food_classification": "python ml/training/train_freshness.py  # adapt for food labels",
    "spoilage": "python ml/training/train_spoilage.py --data ml/datasets/spoilage/data.yaml",
}


def report_inventory() -> dict:
    print("=" * 74)
    print(" INSTALLED MODEL ARTEFACTS")
    print("=" * 74)
    print(f"\nModel directory: {MODEL_DIR}\n")

    summary: dict[str, dict] = {}
    for role, filename in ARTEFACTS.items():
        path = MODEL_DIR / filename
        print(f"{role}")
        print(f"  file    : {filename}")

        if not path.is_file():
            print("  status  : NOT INSTALLED -> the platform uses its transparent baseline")
            print("  metrics : none (TRAINING REQUIRED - no accuracy is claimed)")
            print(f"  train   : {TRAINING_COMMANDS[role]}")
            summary[role] = {"installed": False, "metrics": {}}
            print()
            continue

        entry: dict = {"installed": True, "size_bytes": path.stat().st_size}
        print(f"  status  : installed ({path.stat().st_size / 1024:.0f} KB)")

        if filename.endswith(".joblib"):
            try:
                import joblib

                bundle = joblib.load(path)
                metrics = bundle.get("metrics") or {}
                entry["metrics"] = metrics
                entry["trained_on"] = bundle.get("trained_on")
                entry["version"] = bundle.get("version")
                entry["trained_at"] = bundle.get("trained_at")
                entry["synthetic"] = bool(bundle.get("synthetic"))

                print(f"  version : {bundle.get('version')}")
                print(f"  trained : {bundle.get('trained_at')}")
                print(f"  data    : {bundle.get('trained_on')}")
                if metrics:
                    print("  metrics :")
                    for key, value in metrics.items():
                        print(f"      {key:<22} {float(value):.4f}")
                else:
                    print("  metrics : none recorded in the artefact")
                if bundle.get("limitations"):
                    print(f"  limits  : {bundle['limitations']}")
                if bundle.get("synthetic"):
                    print("  WARNING : SYNTHETIC artefact - metrics have no real-world meaning")
            except Exception as exc:  # noqa: BLE001
                print(f"  ERROR   : could not read the artefact ({type(exc).__name__}: {exc})")
                entry["error"] = str(exc)
        else:
            print("  metrics : see ml/artifacts/spoilage_metrics.json (written by training)")
            metrics_file = REPO_ROOT / "ml" / "artifacts" / "spoilage_metrics.json"
            if metrics_file.is_file():
                data = json.loads(metrics_file.read_text(encoding="utf-8"))
                entry["metrics"] = data.get("metrics", {})
                for key, value in entry["metrics"].items():
                    print(f"      {key:<22} {float(value):.4f}")
        summary[role] = entry
        print()

    # ---- what the running platform would actually use --------------------
    from app.ml.registry import ModelRegistry

    registry = ModelRegistry(demo_mode=False).load()
    described = registry.describe()
    print("-" * 74)
    print(" WHAT THE PLATFORM WOULD SERVE WITH DEMO_MODE=false")
    print("-" * 74)
    print(f"  mode           : {described['mode']}")
    print(f"  trained roles  : {described['trained_roles'] or 'none'}")
    print(f"  baseline roles : {described['baseline_roles'] or 'none'}")
    print(f"  analysis label : {registry.analysis_label()}")
    for note in described["fallback_notes"]:
        print(f"  fallback       : {note}")
    print(f"\n{described['disclaimer']}")
    print("=" * 74)

    return {"artefacts": summary, "registry": described}


def evaluate_freshness(data_dir: Path) -> dict:
    """Re-score the installed freshness classifier on a held-out dataset."""
    import joblib
    from sklearn.metrics import (
        accuracy_score,
        classification_report,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
    )

    from preprocessing.features import build_feature_frame, iter_labelled_images, matrix_from_frame
    from training.train_freshness import normalise_label

    path = MODEL_DIR / ARTEFACTS["freshness"]
    if not path.is_file():
        print(
            f"\nERROR: no freshness artefact at {path}.\n"
            "TRAINING REQUIRED - train one first:\n"
            f"  {TRAINING_COMMANDS['freshness']}",
            file=sys.stderr,
        )
        return {}

    bundle = joblib.load(path)
    model = bundle["model"]
    names = bundle["feature_names"]

    print("\n" + "=" * 74)
    print(" FRESH EVALUATION ON HELD-OUT DATA")
    print("=" * 74)
    print(f"\nArtefact: {path.name} ({bundle.get('version')})")
    print(f"Dataset : {data_dir}")

    pairs = [(image, normalise_label(label)) for image, label in iter_labelled_images(data_dir)]
    print(f"Images  : {len(pairs)}")

    frame = build_feature_frame(pairs, target_size=bundle.get("image_size", 384))
    features, labels = matrix_from_frame(frame, names)
    predictions = model.predict(features)

    classes = sorted(set(labels) | set(predictions))
    metrics = {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision_macro": float(precision_score(labels, predictions, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(labels, predictions, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(labels, predictions, average="macro", zero_division=0)),
    }
    print("\nMetrics on this held-out set:")
    for key, value in metrics.items():
        print(f"  {key:<22} {value:.4f}")

    print("\nPer-class report:")
    print(classification_report(labels, predictions, zero_division=0))

    matrix = confusion_matrix(labels, predictions, labels=classes)
    print("Confusion matrix (rows = true, cols = predicted):")
    print("            " + "".join(f"{c[:9]:>11}" for c in classes))
    for label, row in zip(classes, matrix, strict=False):
        print(f"{label[:11]:<12}" + "".join(f"{int(v):>11}" for v in row))

    return {
        "dataset": str(data_dir),
        "images": len(pairs),
        "metrics": metrics,
        "confusion_matrix": matrix.tolist(),
        "labels": classes,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--freshness-data",
        type=Path,
        default=None,
        help="held-out dataset to re-score the freshness classifier on",
    )
    parser.add_argument("--out", type=Path, default=REPO_ROOT / "ml" / "artifacts")
    args = parser.parse_args()

    report: dict = {"evaluated_at": datetime.now(UTC).isoformat()}
    report["inventory"] = report_inventory()

    if args.freshness_data:
        result = evaluate_freshness(args.freshness_data)
        if result:
            report["freshness_holdout"] = result

    args.out.mkdir(parents=True, exist_ok=True)
    destination = args.out / "evaluation_report.json"
    destination.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"\nReport written: {destination}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
