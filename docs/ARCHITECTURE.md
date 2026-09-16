# FreshLens — System Architecture & Data Design

This document describes the overall architecture, data models, and system workflow of the FreshLens platform.

---

## 1. High-Level System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Web Client                           │
│  (Consumer, Retail Manager, Warehouse Operator, Quality Inspector UI) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / JSON / Multipart
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI API Application                         │
│  - JWT Bearer Authentication & Role-Based Access Control (RBAC)        │
│  - Storage Telemetry Ingestion Router                                  │
│  - Computer Vision Image Analysis Pipeline                              │
│  - Multi-Factor Freshness Scoring Engine                               │
│  - Multi-Factor Shelf-Life Prediction Pipeline                         │
│  - Recommendation Advisory Engine                                      │
│  - PDF / Excel Analytics Report Generator                              │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌────────────────────────────────────┐ ┌─────────────────────────────────┐
│     PostgreSQL Relational DB       │ │     MongoDB Document Store      │
│  (Users, Batches, InventoryItems,  │ │ (StorageReadings, ImageAnalysis,│
│   QualityInspections)              │ │  Notifications, System Logs)    │
└────────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 2. Weighted Freshness Scoring Model

FreshLens computes overall item freshness using the weighted scoring model:

$$\text{Freshness Score} = (0.40 \times \text{Visual Score}) + (0.25 \times \text{Storage Score}) + (0.20 \times \text{Shelf-Life Score}) + (0.15 \times \text{Age Score})$$

### Sub-Score Definitions
1. **Visual Score (40%)**: Derived from computer vision image analysis (color browning degradation, surface roughness/wrinkles, bruising, physical damage, and surface mold).
2. **Storage Score (25%)**: Evaluates temperature and humidity deviations from category-optimal baselines, minus penalties for low air circulation or excessive light exposure.
3. **Shelf-Life Score (20%)**: Ratio of predicted remaining shelf-life days (from the 7-input prediction pipeline) to total ideal product lifespan.
4. **Age Score (15%)**: Ratio of remaining calendar days before expiration to total allotted lifespan.

---

## 3. Quality Categories Mapping

The computed score maps to 5 quality classifications:

| Score Range | Quality Classification | Description |
|---|---|---|
| **85.0 – 100.0** | `Fresh` | Excellent quality, optimal storage condition. |
| **70.0 – 84.9** | `Good` | Minor age decay, fully safe for retail. |
| **50.0 – 69.9** | `Acceptable` | Moderate age/climate deviation, prioritize FEFO dispatch. |
| **30.0 – 49.9** | `Near Spoilage` | High degradation risk, markdown or immediate repurposing required. |
| **0.0 – 29.9** | `Spoiled` | Product unviable or mold-contaminated. Quarantine / compost. |

---

## 4. Spoilage Safety Overrides

If mold contamination is detected (`mold_detected = True`):
- Combined Freshness Score is forced to **0.0**.
- Quality Classification is set to **`Spoiled`**.
- Remaining Shelf-Life Days is set to **0.0**.
- Action status triggers immediate **`QUARANTINED`** or **`REJECTED`** advisories.

---

## 5. Dual Database Architecture

### PostgreSQL (Relational Data)
- **`users`**: User profiles, password hashes, roles (`CONSUMER`, `RETAIL_MANAGER`, `WAREHOUSE_OPERATOR`, `FOOD_QUALITY_INSPECTOR`, `ADMINISTRATOR`).
- **`batches`**: Supply lot tracking (lot number, supplier name, reception timestamp).
- **`inventory_items`**: Tracked food products (name, category, batch link, quantity, unit, packaging_type, entry_date, expiry_date, status, storage_location).
- **`quality_inspections`**: Official audit records created by Food Quality Inspectors (7 input parameters, visual score, status, action taken, remarks, timestamp).

### MongoDB (Document Data)
- **`storage_readings`**: Climate telemetry logs (item_id, warehouse_zone, temperature, humidity, air_circulation, light_exposure, timestamp).
- **`image_analyses`**: Visual scan reports (file_url, freshness_score, color_degradation, texture_roughness, mold_detected, bruising_detected, damage_detected).
- **`notifications`**: System alerts dispatched to user roles based on climate deviations or spoilage events.
