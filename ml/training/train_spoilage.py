"""Train the spoilage object detector (YOLO).

    python ml/training/train_spoilage.py --data ml/datasets/spoilage/data.yaml

STATUS: this script is a complete, runnable wrapper around ultralytics YOLO, but
it deliberately does **not** download any pretrained weights implicitly. You
must either:

  * pass `--weights yolov8n.pt` and accept that ultralytics will fetch it from
    its own release assets (AGPL-3.0 licensed - review before redistributing), or
  * pass a path to weights you already have and can account for.

Nothing is fetched behind your back, and the source of every checkpoint you use
is recorded in the artefact metadata.

Dataset format (standard ultralytics YOLO layout)::

    ml/datasets/spoilage/
      data.yaml
      images/train/*.jpg      labels/train/*.txt
      images/val/*.jpg        labels/val/*.txt
      images/test/*.jpg       labels/test/*.txt

`data.yaml` must list class names the platform understands (see CLASS_MAP in
`backend/app/ml/spoilage/yolo.py`), for example::

    path: .
    train: images/train
    val: images/val
    test: images/test
    names:
      0: mold
      1: bruise
      2: discoloration
      3: damage

Metrics reported: precision, recall, mAP@50 and mAP@50-95 from ultralytics'
own validation on the val/test split - the standard object-detection metrics
the specification asks for.

Until you run this, the platform uses the transparent OpenCV baseline detector
and claims no detection accuracy whatsoever.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--data", type=Path, default=REPO_ROOT / "ml" / "datasets" / "spoilage" / "data.yaml"
    )
    parser.add_argument(
        "--weights",
        default="",
        help=(
            "starting checkpoint. Empty trains from scratch (needs a lot of data). "
            "'yolov8n.pt' asks ultralytics to fetch its own asset - review the AGPL "
            "licence first."
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=REPO_ROOT / "backend" / "app" / "ml" / "models" / "spoilage_yolo.pt",
    )
    parser.add_argument("--metrics-out", type=Path, default=REPO_ROOT / "ml" / "artifacts")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="", help="'cpu', '0', '0,1' - blank auto-detects")
    parser.add_argument("--project", type=Path, default=REPO_ROOT / "ml" / "artifacts" / "yolo_runs")
    parser.add_argument("--name", default="spoilage")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    print("=" * 74)
    print(" TRAIN SPOILAGE DETECTOR (YOLO)")
    print("=" * 74)

    # ---- dependency check ------------------------------------------------
    try:
        from ultralytics import YOLO
    except ImportError:
        print(
            "\nTRAINING REQUIRED - ultralytics is not installed.\n\n"
            "  pip install -r backend/requirements-ml.txt\n\n"
            "ultralytics is AGPL-3.0 licensed. Review the licence before using it in\n"
            "anything you distribute.\n\n"
            "The platform continues to use its transparent OpenCV baseline detector,\n"
            "which claims no detection accuracy.",
            file=sys.stderr,
        )
        return 2

    if not args.data.is_file():
        print(f"\nERROR: dataset config not found: {args.data}", file=sys.stderr)
        print(
            "\nTRAINING REQUIRED - no annotated spoilage dataset is present.\n"
            "Bounding-box annotations for mould/bruising/discoloration are needed;\n"
            "see ml/datasets/README.md for candidate sources and their licences.",
            file=sys.stderr,
        )
        return 1

    weights_source = args.weights or "scratch (no pretrained weights)"
    print(f"\nDataset : {args.data}")
    print(f"Weights : {weights_source}")
    print(f"Epochs  : {args.epochs}   Image size: {args.imgsz}   Batch: {args.batch}")
    if args.weights:
        print(
            "\nNOTE: ultralytics may download this checkpoint from its release assets.\n"
            "      The source is recorded in the artefact metadata."
        )

    # ---- train -----------------------------------------------------------
    model = YOLO(args.weights) if args.weights else YOLO("yolov8n.yaml")

    print("\nTraining...")
    model.train(
        data=str(args.data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device or None,
        project=str(args.project),
        name=args.name,
        seed=args.seed,
        exist_ok=True,
        verbose=True,
    )

    # ---- evaluate --------------------------------------------------------
    print("\n" + "-" * 74)
    print(" VALIDATION METRICS (produced by ultralytics, reported verbatim)")
    print("-" * 74)
    results = model.val(data=str(args.data), imgsz=args.imgsz, device=args.device or None)

    box = getattr(results, "box", None)
    metrics = {}
    if box is not None:
        metrics = {
            "precision": float(getattr(box, "mp", 0.0)),
            "recall": float(getattr(box, "mr", 0.0)),
            "map50": float(getattr(box, "map50", 0.0)),
            "map50_95": float(getattr(box, "map", 0.0)),
        }
        # F1 derived from the reported precision/recall.
        precision, recall = metrics["precision"], metrics["recall"]
        metrics["f1"] = (
            float(2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
        )
        for key, value in metrics.items():
            print(f"  {key:<12} {value:.4f}")
    else:
        print("  ultralytics returned no box metrics - inspect the run directory.")

    # ---- export ----------------------------------------------------------
    run_dir = args.project / args.name
    best = run_dir / "weights" / "best.pt"
    if not best.is_file():
        print(f"\nERROR: expected best weights at {best}", file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best, args.output)
    print(f"\nCheckpoint copied: {best} -> {args.output}")

    args.metrics_out.mkdir(parents=True, exist_ok=True)
    metrics_path = args.metrics_out / "spoilage_metrics.json"
    metrics_path.write_text(
        json.dumps(
            {
                "model": "spoilage_yolo",
                "framework": "ultralytics YOLO",
                "metrics": metrics,
                "dataset": str(args.data),
                "starting_weights": weights_source,
                "epochs": args.epochs,
                "imgsz": args.imgsz,
                "seed": args.seed,
                "trained_at": datetime.now(UTC).isoformat(),
                "run_directory": str(run_dir),
                "licence_note": (
                    "ultralytics is AGPL-3.0. If you started from a pretrained "
                    "checkpoint, record its provenance and licence here."
                ),
                "limitations": (
                    "mAP figures describe the validation split of the dataset above. "
                    "Detection quality on other foods, cameras or lighting is unknown "
                    "until measured."
                ),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Metrics written:   {metrics_path}")

    print("\n" + "=" * 74)
    print(" Set DEMO_MODE=false and restart the API (or POST")
    print(" /api/v1/admin/system/reload-models) to serve this detector.")
    print("=" * 74)
    return 0


if __name__ == "__main__":
    sys.exit(main())
