# FreshLens — Viva & Technical Audit Guide

This document contains concise, technically grounded answers for academic demonstrations and technical audits.

---

### 1. What problem does FreshLens solve?
FreshLens addresses food waste and supply chain degradation across retail and warehousing. Up to 30% of perishable food is wasted due to inaccurate shelf-life estimation and subjective visual inspection. FreshLens automates multi-factor freshness scoring, monitors storage telemetry compliance, and guides dispatch using First Expired, First Out (FEFO) logic.

### 2. What user roles are supported?
FreshLens supports 5 roles with Role-Based Access Control (RBAC):
1. **Consumer**: Read-only product lookup and specimen scanning.
2. **Retail Manager**: Inventory management, stock registration, FEFO dispatch tracking, and markdown advisories.
3. **Warehouse Operator**: Bulk batch registration, climate sensor telemetry logging, and storage compliance tracking.
4. **Food Quality Inspector**: Dedicated inspection workflow, batch auditing, defect classification, and official safety decision logging.
5. **Administrator**: Full platform administration, system oversight, and user role configuration.

### 3. How does the multi-factor shelf-life prediction pipeline work?
The prediction pipeline ingests 7 parameters:
1. Food Image features (Visual freshness score & mold/bruise flags)
2. Product Type (Category)
3. Storage Temperature (°C)
4. Relative Humidity (%)
5. Packaging Type
6. Storage Environmental Conditions (Air Circulation & Light Exposure)
7. Storage Duration (Days)

Features are vectorized in `ShelfLifeFeatureExtractor` and passed to `ShelfLifePredictorModel`. When trained neural regressor weights are not loaded, the model evaluates empirical degradation baselines grounded in USDA FoodKeeper and FAO storage research.

### 4. How is the overall Freshness Score calculated?
FreshLens uses the exact weighted scoring model:
$$\text{Freshness Score} = (0.40 \times \text{Visual Score}) + (0.25 \times \text{Storage Score}) + (0.20 \times \text{Shelf-Life Score}) + (0.15 \times \text{Age Score})$$

- Visual Score (40%): Image analysis browning degradation, roughness, bruising, and mold.
- Storage Score (25%): Temperature and humidity deviations from category guidelines.
- Shelf-Life Score (20%): Predicted remaining shelf life relative to ideal lifespan.
- Age Score (15%): Remaining calendar days relative to total allotted lifespan.

### 5. What are the 5 Quality Categories?
- **Fresh**: Score $\ge 85.0$
- **Good**: Score $70.0 – 84.9$
- **Acceptable**: Score $50.0 – 69.9$
- **Near Spoilage**: Score $30.0 – 49.9$
- **Spoiled**: Score $< 30.0$

### 6. How is safety handled when mold is detected?
If mold contamination is detected (`mold_detected = True`), a safety override forces the combined freshness score directly to **0.0** and sets the status to **`Spoiled`**, overriding any high age or storage sub-scores to prevent consumption of unsafe food.

### 7. Why use a dual-database architecture (PostgreSQL + MongoDB)?
- **PostgreSQL**: Used for structured relational data (Users, Batches, InventoryItems, QualityInspections) requiring strict ACID transactions, foreign keys, and unique constraints.
- **MongoDB**: Used for high-frequency document logs (StorageReadings, ImageAnalysis reports, Notifications) allowing rapid querying of unstructured time-series logs.

### 8. How are reports and exports generated?
Reports are generated from live database queries for 5 report types (Freshness, Shelf-Life, Quality, Waste Reduction, Storage Compliance). Reports include all 7 prediction parameters and can be exported as PDF files (using ReportLab) or formatted Excel workbooks (using OpenPyxl).

### 9. What are the system limitations?
- In development mode without trained weights (`freshness_model.pt`), visual feature extraction uses OpenCV color/texture segmentations and shelf-life predictions use empirical USDA/FAO degradation models.
- Hardware sensors are simulated via manual telemetry ingestion endpoints rather than live physical IoT hardware.
