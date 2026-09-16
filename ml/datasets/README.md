# Datasets

**No dataset is bundled with this repository, and nothing is downloaded
automatically.** The public food-freshness datasets each carry their own licence
and redistributing them inside a project repository would breach several of
them. This document tells you how to obtain each one legally and how to arrange
it so the training scripts can use it.

Until you install a dataset and train a model, the platform runs on its
transparent computer-vision baselines and **claims no accuracy figures**. That is
a deliberate design decision, not a gap — see the "About the AI models" page in
the running application, or `GET /api/v1/system/models`.

---

## Quick start

```bash
# 1. Download a dataset yourself (see the table below) into e.g. ~/Downloads/fruits

# 2. Normalise it into the expected layout
python ml/training/prepare_dataset.py \
  --source ~/Downloads/fruits \
  --target ml/datasets/freshness

# 3. Train, evaluate and serialise
python ml/training/train_freshness.py --data ml/datasets/freshness

# 4. Serve it
#    set DEMO_MODE=false and restart, or as an admin:
#    POST /api/v1/admin/system/reload-models
```

`prepare_dataset.py` verifies each file is a decodable image, de-duplicates by
content hash so the same photo cannot appear in both the train and test split,
optionally balances classes, and writes a `manifest.json` recording exactly what
it copied.

---

## Recommended datasets

| Dataset | Use in this platform | Where to get it | Licence / terms |
| --- | --- | --- | --- |
| **Fruits Fresh & Rotten** (Kaggle: `sriramr/fruits-fresh-and-rotten-for-classification`) | Freshness classification for fruit; spoilage presence | Kaggle — requires an account and accepting the dataset's terms | Check the dataset page. Typically research/educational use; **not redistributable** |
| **Fresh and Stale Images of Fruits and Vegetables** (Kaggle: `raghavrpotdar/fresh-and-stale-images-of-fruits-and-vegetables`) | Fruit *and* vegetable freshness | Kaggle | Per-dataset terms on the Kaggle page |
| **Vegetable Image Dataset** (Kaggle: `misrakahmed/vegetable-image-dataset`) | Vegetable identification; combine with a freshness set | Kaggle | CC-BY-style on the dataset page — verify before use |
| **Food-101** | Food **category identification**, not freshness | <https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/> | Research use only; see the dataset's own licence file |
| **FruitVeg-81 / FIDS30** | Additional produce identification | Institutional pages | Research use; attribution required |

### An important caveat about Food-101

Food-101 labels *what the food is* (pizza, sushi, …), not *how fresh it is*. Use
it for the food-classification role only. Training a freshness model on it would
produce a model that appears to work while measuring nothing relevant.

### On spoilage object detection

The YOLO detector needs **bounding-box annotations** for mould, bruising,
discoloration and physical damage. Very few public datasets provide these. Your
realistic options are:

1. Annotate a subset of a freshness dataset yourself (CVAT, Label Studio and
   Roboflow all export the ultralytics YOLO format directly).
2. Search Roboflow Universe for a "food spoilage" or "fruit defect" detection
   dataset and check its licence.

Until then the platform uses its OpenCV baseline detector, which reports one
explicit rule per indicator and no accuracy figure.

### On shelf-life regression

There is no public dataset mapping (image, storage conditions) → observed
remaining shelf life. Producing one requires a controlled study: store known
batches under measured conditions and record when each became unusable.

`ml/training/train_shelf_life.py --synthetic 4000` will generate rows *from the
platform's own kinetic baseline* so you can verify the training pipeline runs
end to end. The resulting artefact is tagged `synthetic: true`, its version gets
a `+synthetic` suffix and the evaluation script prints a warning — because a
model fitted to that data has merely re-learned the baseline's arithmetic and
has **no real-world predictive validity**.

---

## Expected layouts

### Freshness classification

```
ml/datasets/freshness/
├── fresh/            *.jpg
├── good/             *.jpg      (optional)
├── acceptable/       *.jpg      (optional)
├── near_spoilage/    *.jpg      (optional)
└── spoiled/          *.jpg
```

Two-class datasets (`fresh/` + `spoiled/`) are fine — the training script maps
common directory names such as `rotten`, `stale` and `mouldy` onto the platform's
five bands, prints the mapping it used, and records in the artefact that the
model can only predict the bands it actually saw.

### Spoilage detection (ultralytics YOLO)

```
ml/datasets/spoilage/
├── data.yaml
├── images/{train,val,test}/*.jpg
└── labels/{train,val,test}/*.txt
```

```yaml
# data.yaml
path: .
train: images/train
val: images/val
test: images/test
names:
  0: mold
  1: bruise
  2: discoloration
  3: damage
```

Class names are mapped onto the platform's indicator vocabulary by `CLASS_MAP` in
`backend/app/ml/spoilage/yolo.py`; extend it if you use different names.

### Shelf-life regression

```
ml/datasets/shelf_life/observations.csv
```

```csv
category_slug,temperature_c,humidity_pct,packaging_type,storage_duration_days,product_age_days,freshness_score,base_shelf_life_days,remaining_shelf_life_days
DAIRY,3.2,68,TETRA_PACK,2,2,92,10,7.5
FRUITS,9.1,88,LOOSE,4,5,64,7,1.5
```

`remaining_shelf_life_days` is the observed target. `category_slug` must be one
of the eight platform categories.

---

## Honest evaluation practice

The training scripts follow these rules, and you should keep them if you modify
them:

- **A held-out test split is never touched during training.** Reported metrics
  come only from that split.
- **Metrics are written into the artefact.** The API reads them verbatim and
  displays them; it never synthesises a figure.
- **Missing metrics are shown as missing.** A role with no trained artefact
  reports "training required", not a placeholder number.
- **Synthetic data is labelled synthetic** everywhere it surfaces.
- **De-duplicate before splitting.** Near-duplicate frames leaking across the
  split is the most common cause of implausibly good published results on these
  datasets.

Class imbalance is severe in most public freshness sets, so prefer macro-averaged
precision/recall/F1 over plain accuracy, and always read the confusion matrix.

---

## Checking what is installed

```bash
python ml/evaluation/evaluate.py
```

Prints every artefact slot, whether it is installed, the metrics recorded at
training time, and exactly what the API would serve with `DEMO_MODE=false`.

To re-score an installed classifier on data it has never seen:

```bash
python ml/evaluation/evaluate.py --freshness-data ml/datasets/freshness_holdout
```

---

## What this repository *does* ship

`data/sample/` contains a handful of **procedurally generated** images (drawn
with OpenCV by `backend/app/sample_images.py`), used by the seeder so the
dashboards and the analysis workflow are demonstrable immediately. They are not
photographs, they redistribute nothing, and they are **not suitable for training**
— they are synthetic renderings, and a model trained on them would learn the
renderer, not food.
