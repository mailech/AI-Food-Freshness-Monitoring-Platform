# `ml/` — training and evaluation

This directory holds **training-time** code only. Production inference lives in
`backend/app/ml/` and never imports anything from here, so the API has no
dependency on notebooks, training frameworks or datasets.

```
ml/
├── datasets/       (git-ignored) place datasets here — see datasets/README.md
├── preprocessing/  feature extraction shared with production
├── training/       prepare_dataset.py, train_freshness.py, train_spoilage.py, train_shelf_life.py
├── evaluation/     evaluate.py
├── models/         scratch space for experiments
├── notebooks/      exploratory work (never imported by the API)
└── artifacts/      (git-ignored) metrics JSON, YOLO run directories
```

## The contract between training and serving

`ml/preprocessing/features.py` imports the *production* extractors
(`app.ml.image_analysis.color`, `app.ml.image_analysis.texture`,
`app.ml.preprocessing.image_ops`). A model trained here therefore sees exactly
the same features it will see at inference time. If you change a feature, both
sides change together — which is the point.

Each artefact is a joblib bundle carrying its own metadata:

```python
{
    "model":         fitted estimator / pipeline,
    "feature_names": ordered feature keys,      # inference reproduces this order
    "classes":       label order (classifiers),
    "categorical":   one-hot levels (regressors),
    "metrics":       measured on the held-out test split,
    "trained_on":    dataset description,
    "version":       artefact version,
    "limitations":   plain-English caveats,
}
```

`backend/app/ml/registry.py` loads these when `DEMO_MODE=false`. Any artefact
that is missing or fails to load falls back to its baseline, and the fallback is
reported at `GET /api/v1/system/models` — the platform never silently pretends a
trained model is in use.

## Scripts

| Script | Purpose |
| --- | --- |
| `training/prepare_dataset.py` | Normalise a downloaded dataset into `<band>/<images>`, verify decodability, de-duplicate by content hash, optionally balance classes, write a manifest |
| `training/train_freshness.py` | Random Forest / Gradient Boosting over colour+texture features → accuracy, precision, recall, F1, confusion matrix |
| `training/train_shelf_life.py` | Random Forest / Gradient Boosting / XGBoost regression → MAE, RMSE, R² |
| `training/train_spoilage.py` | ultralytics YOLO detector → precision, recall, mAP@50, mAP@50-95 |
| `evaluation/evaluate.py` | Report installed artefacts and their recorded metrics; optionally re-score on a held-out set |

Every script exits non-zero with an explicit "TRAINING REQUIRED" message when its
dataset is absent, rather than producing a model that appears to work.

## Verifying the pipeline without a dataset

The shelf-life pipeline can be exercised end to end using synthetic samples of
the platform's own kinetic baseline:

```bash
python ml/training/train_shelf_life.py --synthetic 4000
python ml/evaluation/evaluate.py
```

This proves the split → train → evaluate → serialise → load → serve path works.
The artefact is tagged `synthetic: true`, its version gains a `+synthetic`
suffix, and both the training script and `evaluate.py` print a warning, because
its metrics describe the baseline's arithmetic and nothing about real food.

## Optional dependencies

The base install trains the scikit-learn models. Deep learning and object
detection need the extras:

```bash
pip install -r backend/requirements-ml.txt
```

This adds PyTorch, torchvision, ultralytics (**AGPL-3.0** — review before
redistributing), XGBoost and plotting libraries. The platform runs fully without
them.

## Notebooks

`notebooks/` is for exploration. Nothing in the API imports from it, and no
training script depends on it — a notebook can never become a production
dependency here.
