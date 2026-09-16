# FreshLens — Multi-Factor Shelf-Life Prediction Pipeline

This document details the multi-factor shelf-life prediction pipeline implemented in `backend/app/modules/shelf_life/pipeline.py`.

---

## 1. Pipeline Input Architecture

The prediction pipeline ingests 7 required input parameters:

```text
Food Image (Visual Scan Features)
+
Product Category (Product Type)
+
Storage Temperature (°C)
+
Relative Humidity (%)
+
Packaging Type
+
Storage Conditions (Air Circulation & Light Exposure)
+
Storage Duration (Days)
        │
        ▼
[ 1. Feature Preprocessing & Vectorization ]
        │
        ▼
[ 2. Feature Extractor (Scaling & One-Hot Encoding) ]
        │
        ▼
[ 3. Prediction Model Interface ]
        ├── Trained PyTorch / sklearn Regressor (When Weights Loaded)
        └── Grounded USDA FoodKeeper Baseline Model (Fallback)
        │
        ▼
[ 4. Safety Overrides & Uncertainty Evaluator ]
        │
        ▼
Output: Remaining Shelf Life (Days), Risk Level, Expiry Date, Recommendations
```

---

## 2. Parameter Specifications

| Input Parameter | Data Type | Valid Range / Allowed Values | Description |
|---|---|---|---|
| `category` | String | Fruits, Vegetables, Dairy Products, Meat & Poultry, Seafood, Bakery Products, Packaged Foods, Beverages | Product type category mapping to empirical storage baselines. |
| `packaging_type` | String | Vacuum Sealed, Modified Atmosphere Packaging (MAP), Plastic Wrap, Plastic Jug, Cardboard Box, Vented, None | Packaging structure coefficient ($0.9\times$ to $2.5\times$). |
| `temperature` | Float | $-50.0^\circ\text{C}$ to $+80.0^\circ\text{C}$ | Ambient storage temperature. Deviations from optimal drive decay rates. |
| `humidity` | Float | $0.0\%$ to $100.0\%$ RH | Ambient relative humidity. Drives desiccation or moisture activity. |
| `air_circulation` | String | Low, Medium, High | Air movement level. Low circulation flags ethylene accumulation risk in produce. |
| `light_exposure` | String | Dark, Low, Medium, High | Storage light level. High light flags photo-oxidation in fats and produce. |
| `storage_duration_days` | Float | $\ge 0.0$ Days | Days elapsed since lot entry date. |

---

## 3. Modular Pipeline Processing Pipeline

### Component 1: Feature Extraction (`ShelfLifeFeatureExtractor`)
- Validates input ranges. Out-of-bounds inputs return an `INVALID_INPUT` status with a reduced confidence score ($0\%$).
- Encodes `category` via one-hot vectorization across 8 standard food types.
- Applies packaging multiplier coefficients ($2.5\times$ for Vacuum Sealed, $2.0\times$ for MAP, $1.2\times$ for Plastic Wrap, $1.1\times$ for Plastic Jug, $1.0\times$ for None/Cardboard, $0.9\times$ for Vented).
- Computes temperature deviation $\Delta T = T_{\text{actual}} - T_{\text{ideal}}$ and relative humidity deviation $\Delta RH = |RH_{\text{actual}} - RH_{\text{ideal}}|$.

### Component 2: Model Inference (`ShelfLifePredictorModel`)
- **Decoupled Interface**: Checks for trained PyTorch regressor weights file (`ml/models/shelf_life_regressor.pt`).
- **Empirical Baseline Model**: When trained weights are not loaded, the predictor uses empirical degradation baselines grounded in USDA FoodKeeper and FAO storage research.
- **Safety Overrides**: Surface mold detection (`mold_detected = True`) triggers an immediate safety override setting remaining shelf life to `0.0` days and status to `MOLD_CONTAMINATION_OVERRIDE`.

---

## 4. Output Data Structure

The pipeline returns a structured `PredictionResult`:

- `estimated_remaining_days`: Float (rounded to 1 decimal place).
- `predicted_expiry_date`: UTC ISO timestamp ($\text{Current Time} + \text{Remaining Days}$).
- `recommended_temperature`: Ideal storage temperature (°C) for the category.
- `recommended_humidity`: Ideal relative humidity (%) for the category.
- `risk_level`: `HIGH` (<2 days), `MEDIUM` (2–5 days), `LOW` (>5 days).
- `confidence_score`: Percentage rating ($0–100\%$).
- `status`: `SUCCESS`, `INVALID_INPUT`, or `MOLD_CONTAMINATION_OVERRIDE`.
- `methodology`: String describing the underlying model engine (e.g., `"Empirical FoodKeeper Baseline Model (ML Regression Dataset Pending)"`).
- `factors_affecting_shelf_life`: List of key environmental or visual factors impacting product longevity.
- `impact_analysis`: Dictionary summarizing ideal vs current shelf life parameters.
