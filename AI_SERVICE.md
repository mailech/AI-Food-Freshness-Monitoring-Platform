# AI Service & Freshness Classification Technical Documentation

## 1. Overview
The **Food Freshness AI Service** is a high-performance deep learning inference microservice designed for automated food freshness detection, fruit type classification, and storage risk evaluation.

---

## 2. Dataset Specification
- **Source**: Kaggle Produce Freshness & Spoilage Dataset (`sriramr/fruits-fresh-and-rotten-for-classification`).
- **Total Valid Images Available**: 27,198 images (0 corrupt files detected during verification).
- **Target Classes**: 6 balanced visual categories:
  1. `freshapples`
  2. `freshbanana`
  3. `freshoranges`
  4. `rottenapples`
  5. `rottenbanana`
  6. `rottenoranges`

### Stratified Dataset Split
| Split | Total Images | Images Per Class | Proportion |
|---|---|---|---|
| **Training** | 3,865 | ~700 / class | 70% |
| **Validation** | 890 | ~150 / class | 15% |
| **Held-out Test** | 882 | ~150 / class | 15% |
| **Total Experiment Set** | **5,637** | **~1,000 / class** | **100%** |

---

## 3. Image Preprocessing & Augmentation Pipeline
- **Input Resolution**: $224 \times 224 \times 3$ RGB.
- **Normalization**: Standard ImageNet mean ($[0.485, 0.456, 0.406]$) and std ($[0.229, 0.224, 0.225]$).
- **Training Augmentations**:
  - Random Horizontal Flips
  - Random Rotations ($\pm 15^\circ$)
  - Random Color Jitter (brightness & contrast $\pm 15\%$)
  - Lanczos high-fidelity resampling

---

## 4. Model Architecture & Transfer Learning
- **Backbone Architecture**: **EfficientNetB0** pretrained on ImageNet-1k.
- **Feature Extractor**: 1,280-dimensional global average pooled bottleneck features.
- **Custom Classification Head**:
  - `Dropout(p=0.3)`
  - `Linear(1280 -> 256)`
  - `ReLU()`
  - `Dropout(p=0.2)`
  - `Linear(256 -> 6)`
  - `Softmax(dim=1)`
- **Loss Function**: Multi-class Cross-Entropy Loss (`nn.CrossEntropyLoss`).
- **Optimizer**: Adam ($\text{learning rate} = 1\times 10^{-3}$, ReduceLROnPlateau scheduler).

---

## 5. Model Evaluation Metrics (Held-Out Test Set)

| Metric | Measured Value |
|---|---|
| **Overall Test Accuracy** | **97.73%** |
| **Macro Precision** | **97.81%** |
| **Macro Recall** | **97.70%** |
| **Macro F1-Score** | **97.74%** |
| **Weighted F1-Score** | **97.73%** |

### Per-Class Performance Breakdown
| Class Name | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| `freshapples` | 0.94 | 0.99 | **0.97** | 147 |
| `freshbanana` | 0.99 | 0.99 | **0.99** | 145 |
| `freshoranges` | 0.99 | 0.99 | **0.99** | 147 |
| `rottenapples` | 0.97 | 0.93 | **0.95** | 150 |
| `rottenbanana` | 0.99 | 0.99 | **0.99** | 147 |
| `rottenoranges` | 0.97 | 0.97 | **0.97** | 146 |

### Artifacts Location
- Production Model Weights: [`ai-service/app/models/freshness_model.pth`](file:///c:/Users/HP/Desktop/AI-Food-Freshness-Monitoring-Platform/ai-service/app/models/freshness_model.pth)
- Class Mapping Dictionary: [`ai-service/app/models/class_names.json`](file:///c:/Users/HP/Desktop/AI-Food-Freshness-Monitoring-Platform/ai-service/app/models/class_names.json)
- Confusion Matrix Plot: [`ai-service/app/models/confusion_matrix.png`](file:///c:/Users/HP/Desktop/AI-Food-Freshness-Monitoring-Platform/ai-service/app/models/confusion_matrix.png)
- Metrics Report: [`ai-service/app/models/evaluation_results.json`](file:///c:/Users/HP/Desktop/AI-Food-Freshness-Monitoring-Platform/ai-service/app/models/evaluation_results.json)

---

## 6. Inference API Specification

### Health Check
`GET http://localhost:8001/health`

### Predict Endpoint
`POST http://localhost:8001/predict`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `image`: Binary image file (Required)
  - `food_type`: string (Optional)
  - `category`: string (Optional)
  - `temperature`: float (Optional)
  - `humidity`: float (Optional)
  - `packaging_type`: string (Optional)
  - `storage_duration`: int (Optional)

### Example Response:
```json
{
  "analysis_id": "ana-0ad19c8b",
  "food_type": {
    "label": "Apple",
    "confidence": 0.95
  },
  "freshness": {
    "label": "fresh",
    "confidence": 0.9575,
    "fresh_probability": 0.9822,
    "rotten_probability": 0.0178
  },
  "visual_score": 98.2,
  "spoilage_probability": 0.0178,
  "shelf_life": {
    "remaining_days": 13,
    "confidence": null,
    "status": "model_not_available",
    "note": "Shelf-life model requires temporal deterioration dataset with ground-truth remaining days."
  },
  "storage": {
    "temperature": 4.0,
    "humidity": 85.0,
    "status": "normal",
    "score": 90.0,
    "issues": []
  },
  "freshness_score": 95.0,
  "detected_issues": [
    "None"
  ],
  "recommendations": [
    "Maintain standard cold storage between 2°C and 4°C with controlled humidity.",
    "Continue standard FIFO inventory dispatch."
  ],
  "inference_time_ms": 87.95,
  "model_version": "EfficientNetB0-Freshness-v1.0"
}
```

---

## 7. Known Limitations & Real Shelf-Life Roadmap
1. **Shelf-Life Ground Truth Scope**:
   The Kaggle dataset contains fresh vs rotten images captured at discrete stages. It does **not** contain longitudinal time-series data with ground-truth days-to-failure labels. Thus, remaining shelf-life days are computed via calibrated food baseline rules and clearly marked as `status: "model_not_available"`.
2. **Future Shelf-Life ML Approach**:
   Once a temporal hyperspectral / RGB dataset with timestamped sensory degradation labels is acquired, a separate regression model ($\text{ResNet/Vision Transformer} \times \text{LSTM/GBDT}$) will be plugged into the modular `predict_shelf_life(features)` interface without altering backend or frontend contracts.
