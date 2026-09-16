"""Train the shelf-life regressor.

    python ml/training/train_shelf_life.py --data ml/datasets/shelf_life/observations.csv

Expected CSV columns (extra columns are ignored):

    category_slug,temperature_c,humidity_pct,packaging_type,storage_duration_days,
    product_age_days,freshness_score,base_shelf_life_days,remaining_shelf_life_days

`remaining_shelf_life_days` is the target: the observed number of days the item
remained usable after the observation was recorded.

Metrics reported and stored: MAE, RMSE, R2 on a held-out test split, exactly as
the specification requires.

IMPORTANT
---------
There is no bundled dataset. Recording real shelf-life observations requires a
controlled study; until you have one the platform uses its documented kinetic
baseline and claims no accuracy. `--synthetic` generates data *from that same
baseline* purely to exercise the pipeline end to end - it teaches the model
nothing about real food, and the artefact is clearly marked as such.
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

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

ARTEFACT_VERSION = "1.0.0"

NUMERIC_FEATURES = [
    "temperature_c",
    "humidity_pct",
    "storage_duration_days",
    "product_age_days",
    "freshness_score",
    "base_shelf_life_days",
]
CATEGORICAL_FEATURES = ["category_slug", "packaging_type"]
TARGET = "remaining_shelf_life_days"


def generate_synthetic(rows: int, seed: int) -> pd.DataFrame:
    """Sample the documented kinetic baseline, with noise.

    This exists ONLY to prove the pipeline runs. A model fitted to it merely
    re-learns the baseline's own arithmetic.
    """
    from app.core.category_rules import CATEGORY_PROFILES
    from app.ml.shelf_life.baseline import BaselineShelfLifeModel

    rng = np.random.default_rng(seed)
    model = BaselineShelfLifeModel()
    packaging = [
        "NONE", "LOOSE", "PAPER", "PLASTIC_WRAP", "PLASTIC_CONTAINER",
        "VACUUM_SEALED", "MODIFIED_ATMOSPHERE", "CANNED", "GLASS_JAR", "TETRA_PACK",
    ]
    slugs = list(CATEGORY_PROFILES)
    records: list[dict[str, object]] = []

    for _ in range(rows):
        slug = str(rng.choice(slugs))
        profile = CATEGORY_PROFILES[slug]
        rule = profile.storage_rule
        temperature = float(rng.uniform(rule.temp_min_c - 3, rule.temp_max_c + 9))
        humidity = float(rng.uniform(max(0, rule.humidity_min_pct - 15), min(100, rule.humidity_max_pct + 10)))
        pack = str(rng.choice(packaging))
        freshness = float(rng.uniform(10, 100))
        base = float(profile.baseline_shelf_life_days)
        duration = float(rng.uniform(0, base * 1.1))

        features = {
            "category_slug": slug,
            "base_shelf_life_days": base,
            "temperature_c": temperature,
            "humidity_pct": humidity,
            "packaging_type": pack,
            "freshness_score": freshness,
            "storage_duration_days": duration,
            "product_age_days": duration + float(rng.uniform(0, 3)),
        }
        prediction = model.predict(features)
        # Multiplicative noise so the target is not perfectly recoverable.
        target = max(0.0, prediction.remaining_days * float(rng.normal(1.0, 0.14)))
        records.append({**features, TARGET: round(target, 3)})

    return pd.DataFrame(records)


def build_matrix(
    frame: pd.DataFrame, categorical_levels: dict[str, list[str]] | None = None
) -> tuple[np.ndarray, dict[str, list[str]]]:
    """Numeric columns + one-hot categoricals, in a stable column order."""
    levels = categorical_levels or {
        column: sorted(frame[column].astype(str).dropna().unique().tolist())
        for column in CATEGORICAL_FEATURES
    }

    numeric = frame.reindex(columns=NUMERIC_FEATURES).astype(float).fillna(0.0).to_numpy()
    blocks = [numeric]
    for column in CATEGORICAL_FEATURES:
        values = frame[column].astype(str).to_numpy()
        block = np.zeros((len(frame), len(levels[column])), dtype=np.float64)
        for index, level in enumerate(levels[column]):
            block[:, index] = (values == level).astype(np.float64)
        blocks.append(block)
    return np.hstack(blocks), levels


def build_model(kind: str, seed: int):
    if kind == "xgboost":
        try:
            from xgboost import XGBRegressor
        except ImportError:
            print(
                "xgboost is not installed (pip install -r backend/requirements-ml.txt); "
                "falling back to gradient_boosting",
                file=sys.stderr,
            )
            kind = "gradient_boosting"
        else:
            return XGBRegressor(
                n_estimators=500, learning_rate=0.06, max_depth=6,
                subsample=0.9, colsample_bytree=0.9, random_state=seed, n_jobs=-1,
            )

    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

    if kind == "gradient_boosting":
        return GradientBoostingRegressor(
            n_estimators=400, learning_rate=0.06, max_depth=4, random_state=seed
        )
    return RandomForestRegressor(
        n_estimators=400, min_samples_leaf=2, n_jobs=-1, random_state=seed
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument(
        "--data", type=Path, default=REPO_ROOT / "ml" / "datasets" / "shelf_life" / "observations.csv"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=REPO_ROOT / "backend" / "app" / "ml" / "models" / "shelf_life_regressor.joblib",
    )
    parser.add_argument("--metrics-out", type=Path, default=REPO_ROOT / "ml" / "artifacts")
    parser.add_argument(
        "--model",
        choices=["random_forest", "gradient_boosting", "xgboost"],
        default="gradient_boosting",
    )
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--val-size", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--synthetic",
        type=int,
        default=0,
        metavar="ROWS",
        help="generate N synthetic rows from the kinetic baseline (pipeline test only)",
    )
    args = parser.parse_args()

    try:
        import joblib
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        from sklearn.model_selection import train_test_split
    except ImportError as exc:
        print(f"ERROR: scikit-learn/joblib are required: {exc}", file=sys.stderr)
        return 2

    print("=" * 74)
    print(" TRAIN SHELF-LIFE REGRESSOR")
    print("=" * 74)

    # ---- 1. load ---------------------------------------------------------
    synthetic = False
    if args.synthetic > 0:
        print(f"\nGenerating {args.synthetic} SYNTHETIC rows from the kinetic baseline.")
        print("  This validates the pipeline only - it learns nothing about real food.")
        frame = generate_synthetic(args.synthetic, args.seed)
        synthetic = True
    elif args.data.is_file():
        print(f"\nLoading {args.data}")
        frame = pd.read_csv(args.data)
    else:
        print(f"\nERROR: dataset not found: {args.data}", file=sys.stderr)
        print(
            "\nTRAINING REQUIRED: no shelf-life observations are available. The platform\n"
            "continues to use its documented kinetic baseline and claims no accuracy.\n"
            "Provide a CSV (see the module docstring) or run with --synthetic 4000 to\n"
            "exercise the pipeline.",
            file=sys.stderr,
        )
        return 1

    missing = [column for column in (*NUMERIC_FEATURES, *CATEGORICAL_FEATURES, TARGET) if column not in frame.columns]
    if missing:
        print(f"\nERROR: the dataset is missing required columns: {missing}", file=sys.stderr)
        return 1

    frame = frame.dropna(subset=[TARGET])
    if len(frame) < 50:
        print(f"\nERROR: only {len(frame)} usable rows; at least 50 are needed.", file=sys.stderr)
        return 1

    print(f"Rows: {len(frame)}")
    print(f"Target '{TARGET}': mean={frame[TARGET].mean():.2f} "
          f"std={frame[TARGET].std():.2f} min={frame[TARGET].min():.2f} max={frame[TARGET].max():.2f}")

    # ---- 2. features -----------------------------------------------------
    matrix, levels = build_matrix(frame)
    target = frame[TARGET].astype(float).to_numpy()
    print(f"Design matrix: {matrix.shape[0]} x {matrix.shape[1]} "
          f"({len(NUMERIC_FEATURES)} numeric + one-hot categoricals)")

    # ---- 3. split --------------------------------------------------------
    x_train_full, x_test, y_train_full, y_test = train_test_split(
        matrix, target, test_size=args.test_size, random_state=args.seed
    )
    validation_fraction = args.val_size / (1.0 - args.test_size)
    x_train, x_val, y_train, y_val = train_test_split(
        x_train_full, y_train_full, test_size=validation_fraction, random_state=args.seed
    )
    print(f"Split: train={len(y_train)} val={len(y_val)} test={len(y_test)}")

    # ---- 4. train --------------------------------------------------------
    print(f"\nTraining {args.model}...")
    model = build_model(args.model, args.seed)
    model.fit(x_train, y_train)

    val_predictions = model.predict(x_val)
    print(
        f"Validation: MAE={mean_absolute_error(y_val, val_predictions):.3f} "
        f"R2={r2_score(y_val, val_predictions):.4f}"
    )

    # ---- 5. evaluate -----------------------------------------------------
    print("\n" + "-" * 74)
    print(" TEST-SET EVALUATION (stored verbatim in the artefact)")
    print("-" * 74)
    predictions = model.predict(x_test)

    mae = float(mean_absolute_error(y_test, predictions))
    rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
    r2 = float(r2_score(y_test, predictions))
    within_one = float(np.mean(np.abs(predictions - y_test) <= 1.0))
    within_two = float(np.mean(np.abs(predictions - y_test) <= 2.0))

    metrics = {
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "within_1_day": within_one,
        "within_2_days": within_two,
        "validation_mae": float(mean_absolute_error(y_val, val_predictions)),
    }
    print(f"  MAE  (days)          {mae:.4f}")
    print(f"  RMSE (days)          {rmse:.4f}")
    print(f"  R2                   {r2:.4f}")
    print(f"  within +/-1 day      {within_one:.2%}")
    print(f"  within +/-2 days     {within_two:.2%}")

    # ---- 6. serialise ----------------------------------------------------
    feature_columns = list(NUMERIC_FEATURES)
    for column in CATEGORICAL_FEATURES:
        feature_columns += [f"{column}={level}" for level in levels[column]]

    importances = {}
    if hasattr(model, "feature_importances_"):
        ranked = sorted(
            zip(feature_columns, model.feature_importances_, strict=False), key=lambda kv: -kv[1]
        )
        importances = {name: float(value) for name, value in ranked[:25]}
        print("\nTop 10 features:")
        for name, value in ranked[:10]:
            print(f"  {name:<34} {value:.4f}")

    trained_on = (
        f"SYNTHETIC baseline sample ({len(frame)} rows) - pipeline validation only, "
        "NOT real observations"
        if synthetic
        else f"{args.data.name} ({len(frame)} observations)"
    )

    bundle = {
        "model": model,
        "feature_names": NUMERIC_FEATURES,
        "categorical": levels,
        "metrics": metrics,
        "feature_importances": importances,
        "trained_on": trained_on,
        "version": ARTEFACT_VERSION + ("+synthetic" if synthetic else ""),
        "trained_at": datetime.now(UTC).isoformat(),
        "estimator": args.model,
        "seed": args.seed,
        "synthetic": synthetic,
        "limitations": (
            "Fitted to synthetic samples of the platform's own kinetic baseline. It "
            "reproduces that baseline's arithmetic and carries no real-world "
            "predictive validity."
            if synthetic
            else "Metrics come from one held-out test split of the dataset above. They "
            "describe performance on similar products under similar storage regimes "
            "and must not be extrapolated."
        ),
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, args.output)
    print(f"\nArtefact written: {args.output}")

    args.metrics_out.mkdir(parents=True, exist_ok=True)
    metrics_path = args.metrics_out / "shelf_life_metrics.json"
    metrics_path.write_text(
        json.dumps(
            {
                "model": "shelf_life_regressor",
                "estimator": args.model,
                "metrics": metrics,
                "trained_on": trained_on,
                "synthetic": synthetic,
                "trained_at": bundle["trained_at"],
                "limitations": bundle["limitations"],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Metrics written:  {metrics_path}")

    if synthetic:
        print(
            "\nREMINDER: this artefact is synthetic. Do not present its metrics as\n"
            "          evidence of real shelf-life prediction accuracy."
        )
    print("=" * 74)
    return 0


if __name__ == "__main__":
    sys.exit(main())
