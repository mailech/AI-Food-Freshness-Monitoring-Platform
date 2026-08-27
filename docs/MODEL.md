# FreshLens - Food Freshness AI Model Documentation

This document describes the food freshness visual computer vision model specifications, expected training structures, and inference pipelines.

---

## 1. Model Architecture
The production model utilizes a custom convolutional neural network (`FoodFreshnessCNN` implemented in PyTorch).

* **Feature Extractor Layer**:
  - **Conv Layer 1**: Input channels = 3, Output channels = 16, kernel = 3x3, padding = 1. Batch Normalization, ReLU activation, MaxPool2d (2x2).
  - **Conv Layer 2**: Input channels = 16, Output channels = 32, kernel = 3x3, padding = 1. Batch Normalization, ReLU activation, MaxPool2d (2x2).
  - **Conv Layer 3**: Input channels = 32, Output channels = 64, kernel = 3x3, padding = 1. Batch Normalization, ReLU activation.
  - **Global Average Pooling**: Reduces height and width dimension to 1x1, producing a 64-dimensional feature vector.
* **Classification Header**:
  - **Linear Layer 1**: Dimensions: 64 to 32, ReLU activation.
  - **Linear Layer 2**: Dimensions: 32 to 5 classes (representing classification probabilities via Softmax).

---

## 2. Classes Mapping
The output probabilities match these specific target indices:
- Class `0`: `FRESH` (good quality produce)
- Class `1`: `SPOILED` (advanced decay)
- Class `2`: `MOLD` (surface mold)
- Class `3`: `BRUISED/DAMAGED` (surface physical defects)
- Class `4`: `UNKNOWN` (fallback for low-confidence scans)

---

## 3. Dataset Requirements
A labeled freshness dataset is required to generate `freshness_model.pt`.

### Required Directory Schema
To run the training scripts, compile your image files into the following format:
```text
dataset/
├── train/
│   ├── FRESH/             # Positive fresh food images
│   ├── SPOILED/           # Spoiled produce images
│   ├── MOLD/              # Moldy produce images
│   └── BRUISED_DAMAGED/   # Bruised/damaged produce images
└── val/
    ├── FRESH/
    ├── SPOILED/
    ├── MOLD/
    └── BRUISED_DAMAGED/
```

---

## 4. Training Configuration
The training script [`backend/ml/training/train.py`](file:///d:/FreshLens/backend/ml/training/train.py) implements the following configuration:
* **Image Size**: Resized to `224x224` pixels.
* **Augmentation**: Random horizontal flip, random rotation (15 degrees).
* **Optimizer**: Adam (learning rate = `0.001`).
* **Loss Function**: Cross-Entropy Loss.
* **Batch Size**: 32 (default).
* **Early Stopping**: Checkpoint saves weights only if the validation loss decreases.

---

## 5. Evaluation & Performance Check
The evaluation script [`backend/ml/training/evaluate.py`](file:///d:/FreshLens/backend/ml/training/evaluate.py) calculates the following:
* **Accuracy**: Metric overall prediction correctness.
* **Precision / Recall / F1-Score**: Macro-averaged.
* **Confusion Matrix**: 5x5 prediction map.

---

## 6. Production Inference Pipeline
At runtime, image uploads are routed as follows:
1. `validate_image_file` checks the image constraints (Extensions: `.jpg`, `.jpeg`, `.png`; Max Size: 5MB).
2. `preprocess_image` resizes, normalizes (ImageNet stats), and converts files into channel-first shape `(1, 3, 224, 224)`.
3. If `DEMO_MODE=True`, it maps OpenCV colors/textures to deterministic predictions.
4. If `DEMO_MODE=False`, `model_loader.py` loads `freshness_model.pt` on the targeted CPU/GPU, executes the forward pass, and checks outcomes against `MODEL_CONFIDENCE_THRESHOLD=0.60`.

---

## 7. Model File Specifications
* **Target Filename**: `freshness_model.pt`
* **Target Directory**: `backend/ml/models/`
* **Format**: PyTorch state-dictionary weights file (saved via `torch.save(model.state_dict(), path)`).
* **Input dimensions**: `(1, 3, 224, 224)`
* **Output dimensions**: `(1, 5)`

---

## 8. Limitations
- **Trained weights missing**: This repository does not contain pretrained neural network weights. AI scans are computed via OpenCV segmentations in development.
- **CPU Inference latency**: Running heavy model inferences on CPU is slower than running on GPU targets.
