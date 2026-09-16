# FreshLens — 5-Minute Demonstration Script

This script outlines a 5-minute walkthrough of the FreshLens platform for live reviews and demonstrations.

---

### 0:00–0:45 | Introduction & Overview
* **Action**: Display the Landing Page of FreshLens.
* **Talking Points**: 
  - *"Welcome to FreshLens. Up to 30% of fresh food degrades before consumption due to inaccurate forecasting and subjective manual inspection."*
  - *"FreshLens combines Computer Vision visual analysis, multi-factor storage telemetry monitoring, a 7-factor prediction pipeline, and First Expired, First Out (FEFO) inventory ordering to minimize spoilage."*

### 0:45–1:30 | Multi-Role Portal & Role Simulator
* **Action**: Navigate to `/dashboard/inspector` or switch roles in the Sandbox Simulator.
* **Talking Points**:
  - *"FreshLens enforces Role-Based Access Control (RBAC) across 5 roles: Consumer, Retail Manager, Warehouse Operator, Food Quality Inspector, and Administrator."*
  - *"Here in the Food Quality Inspector Dashboard, inspectors conduct formal quality audits by combining visual specimen scans with environmental metrics."*

### 1:30–2:30 | Food Quality Inspector Audit Workflow
* **Action**:
  1. Fill in the Quality Inspection Audit form (Product Name: `Gala Apples`, Category: `Fruits`, Packaging: `Cardboard Box`, Temp: `4.0°C`, Humidity: `85%`, Air Circulation: `Medium`, Light: `Low`, Duration: `2 days`).
  2. Upload an image specimen.
  3. Click **File Quality Inspection Audit**.
* **Talking Points**:
  - *"The inspector enters the 7 mandatory parameters: Food Image, Product Type, Temperature, Humidity, Packaging Type, Air/Light Storage Conditions, and Storage Duration."*
  - *"The backend executes feature vectorization and runs the prediction pipeline to estimate remaining shelf life."*

### 2:30–3:30 | Freshness Scoring & Safety Mold Override
* **Action**: Review the generated inspection report details.
* **Talking Points**:
  - *"FreshLens calculates the overall Freshness Score using the weighted model: Visual 40%, Storage 25%, Shelf-Life 20%, Product Age 15%."*
  - *"Scores map directly into 5 categories: Fresh, Good, Acceptable, Near Spoilage, and Spoiled."*
  - *"If mold is identified during the visual scan, a safety override forces the score to 0.0 and classifies the item as Spoiled immediately."*

### 3:30–4:15 | Inventory Analytics & FEFO Recommendations
* **Action**: Navigate to `/dashboard/retail` to view FEFO dispatch order.
* **Talking Points**:
  - *"The recommendation engine generates advisories across 5 areas: storage adjustments, consumption urgency, FEFO inventory rotation, waste reduction, and quality improvement."*
  - *"Items decaying faster than calendar limits trigger explicit FEFO override warnings so managers dispatch them ahead of older stock."*

### 4:15–5:00 | Reports Hub & Real-Data Exports
* **Action**: Navigate to `/dashboard/reports`, view the preview, and download a PDF / Excel report.
* **Talking Points**:
  - *"The Reports Hub compiles Freshness, Shelf-Life, Quality, Waste Reduction, and Storage Compliance reports from real database records."*
  - *"We can export full audits as PDF summaries or formatted Excel sheets containing all prediction parameters and model methodologies. Thank you!"*
