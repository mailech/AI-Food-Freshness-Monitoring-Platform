# FreshLens - Product Roadmap

This document outlines the product stages of the FreshLens platform.

---

## 1. Version 1: Current Working Release (Demo-Grade)
- **Role-Based Access Control**: Standardized permissions gating Consumer, Retail, Warehouse, and Admin dashboard layers.
- **Computer Vision Scanner**: Features segmentations mapping color browning ratios and Laplace roughness indexes to deterministic classes under `DEMO_MODE=True`, and abstract PyTorch loaders under `DEMO_MODE=False`.
- **Hybrid Scoring**: Fuses visual degradation, Arrhenius kinetics calculations, and ambient climate compliance.
- **Dual Databases**: Transactions logged in PostgreSQL; telemetry readings and analyses logged in MongoDB.
- **Secure uploads & Error Gating**: Request size constraints, type checks, and global error handlers preventing internal details exposure.

---

## 2. Version 2: Production Roadmap
- **Trained Neural Network Weight Deployment**:
  - Training `FoodFreshnessCNN` on larger open-source fruit/vegetable datasets (Fruits Freshness, Food-101) to deploy state-dict `.pt` files.
- **YOLOv8 Object Detection**:
  - Incorporating YOLO bounding boxes to visually localize and highlight bruising and mold regions on product preview cards.
- **IoT Hardware Integration**:
  - Supporting physical Bluetooth/ESP32 sensor modules to push temperature and humidity readings directly to the `/api/v1/storage/reading` endpoint.
- **Cloud Object Storage (AWS S3 / Azure Blob)**:
  - Transitioning image file persistence from local directories to secure cloud buckets.
- **Automatic Telemetry Invalidation**:
  - Adding scheduled cron jobs to clear log caches and delete dynamic uploads after set retention limits.
