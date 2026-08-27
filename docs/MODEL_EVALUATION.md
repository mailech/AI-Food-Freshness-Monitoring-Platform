# FreshLens - AI Model Evaluation Report

This document reports on the current classification specifications and evaluation criteria of the FreshLens image freshness analysis model.

---

## 1. Executive Summary
Formal model evaluation is pending because trained weights/labeled evaluation data are not currently available.

The system is deployed in **Demo Mode** (`DEMO_MODE=True`) by default to allow end-to-end user flows, with computer vision segmentations dynamically mapping to target classes. The PyTorch inference layers are verified and prepared for immediate state-dictionary weight deployment.

---

## 2. Model Specifications & Target Classes
The target prediction classes are:
1. `FRESH`: Identifies clean, non-degraded food specimens.
2. `SPOILED`: Identifies advanced discoloration or decomposition indicators.
3. `MOLD`: Confirms active surface mold contamination (triggers safety overrides).
4. `BRUISED/DAMAGED`: Flags visible physical impact or compression defects.
5. `UNKNOWN`: Fallback category triggered when class confidence drops below the threshold limit.

---

## 3. Image Preprocessing Pipeline
To prepare visual specimens for PyTorch network inference:
* **Integrity Audits**: Uploaded files must be under 5MB and pass minimum pixel requirements (`32x32px`).
* **Conversion**: PIL decodes input files and forces standard 3-channel RGB maps.
* **Resizing**: Standard bilinear interpolations scale the arrays to `224x224` pixels.
* **ImageNet Normalization**: Normalizes pixel values:
  * Means: `[0.485, 0.456, 0.406]`
  * Standard Deviations: `[0.229, 0.224, 0.225]`
* **Channel Ordering**: Transposes inputs to PyTorch channel-first formatting `(1, 3, 224, 224)`.

---

## 4. Evaluation Criteria
When training records and datasets (such as Fruits Freshness or Food-101) are loaded, the following metrics will be calculated by the validation script (`backend/ml/evaluation/evaluate_model.py`):
- **Accuracy**: Overall prediction correctness ratio.
- **Precision**: Multi-class macro-average precision checking class correctness.
- **Recall**: Multi-class macro-average recall checking class coverage.
- **F1-Score**: Weighted harmonic mean of precision and recall.
- **Confusion Matrix**: 5x5 array representing predicted vs. actual classes.
