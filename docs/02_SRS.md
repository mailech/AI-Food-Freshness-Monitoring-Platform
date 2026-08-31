# Software Requirements Specification (SRS)
## AI-Powered Food Freshness Monitoring Platform

Version 1.0 — Based on: AI_Food Freshness Monitoring Platform.pdf

---

## 1. Introduction

### 1.1 Purpose
This SRS defines detailed functional and non-functional requirements for the Food Freshness Monitoring Platform, an AI system that estimates food freshness from images and environmental data, predicts remaining shelf life, detects spoilage, and generates storage recommendations.

### 1.2 Scope
The platform serves consumers, retail managers, warehouse operators, food quality inspectors, and administrators through a web application with role-based dashboards.

### 1.3 Definitions & Acronyms
| Term | Definition |
|---|---|
| JWT | JSON Web Token used for stateless authentication |
| RBAC | Role-Based Access Control |
| MAE | Mean Absolute Error (regression metric) |
| CNN | Convolutional Neural Network |
| YOLO | You Only Look Once — object detection model family |
| MQTT | Lightweight IoT messaging protocol |

### 1.4 References
- Source project brief PDF (15 pages)
- Datasets: Fruits Freshness, Vegetable Freshness, Kaggle Food Freshness, Food-101

---

## 2. Overall Description

### 2.1 Product Perspective
Web-based client-server platform: React/Next.js SPA frontend, FastAPI backend, PostgreSQL + MongoDB persistence, ML inference services, Dockerized deployment on AWS/Azure.

### 2.2 User Classes & Characteristics

| User Class | Capabilities |
|---|---|
| Consumer | Register items, upload images, view freshness/shelf-life, receive recommendations |
| Retail Manager | All consumer features + inventory quality monitoring, shelf-life alerts, waste insights |
| Warehouse Operator | Storage compliance monitoring, batch freshness reports, environmental analytics |
| Food Quality Inspector | Spoilage verification, quality classification, compliance validation |
| Administrator | Full access: user management, platform analytics, system monitoring, report management |

### 2.3 Operating Environment
- Modern browsers (Chrome/Firefox/Edge/Safari)
- Server: Docker containers on Linux cloud VMs (AWS/Azure)
- Optional sensor gateways publishing via MQTT

### 2.4 Constraints
- 8-week delivery across 4 milestones
- Must use prescribed stack (FastAPI, React, PostgreSQL/MongoDB)
- Image datasets required before M2 model training

### 2.5 Assumptions
- Users have camera-equipped devices or image files of food.
- Manual entry of storage conditions allowed when sensors are absent.
- Cloud account available for deployment in M4.

---

## 3. Functional Requirements

### 3.1 Module 1 — User Authentication & RBAC

| Req ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | System shall support user registration with email/password validation. | Must |
| FR-1.2 | System shall authenticate users via JWT (access + refresh tokens). | Must |
| FR-1.3 | System shall support OAuth2 login (e.g., Google). | Should |
| FR-1.4 | System shall enforce role-based access control for all endpoints. | Must |
| FR-1.5 | Users shall view/edit profile information and change passwords. | Must |
| FR-1.6 | Admin shall manage users (list, activate/deactivate, assign roles). | Must |

Roles: Consumer, Retail Manager, Warehouse Operator, Food Quality Inspector, Administrator.

### 3.2 Module 2 — Food Inventory Management

| Req ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Users shall register food items (name, category, image, dates). | Must |
| FR-2.2 | System shall manage batches (batch ID, quantity, received date). | Must |
| FR-2.3 | Items shall be categorized into 8 categories: Fruits, Vegetables, Dairy Products, Meat & Poultry, Seafood, Bakery Products, Packaged Foods, Beverages. | Must |
| FR-2.4 | System shall track inventory quantities and locations. | Must |
| FR-2.5 | System shall manage expiry dates and flag expiring/expired items. | Must |

### 3.3 Module 3 — Food Image Analysis Engine

| Req ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Users shall upload food images (JPEG/PNG; size limit enforced). | Must |
| FR-3.2 | Engine shall detect visual freshness via trained CNN/YOLO models. | Must |
| FR-3.3 | Engine shall perform color degradation analysis (OpenCV histograms). | Must |
| FR-3.4 | Engine shall analyze surface texture changes. | Should |
| FR-3.5 | Engine shall detect mold presence. | Must |
| FR-3.6 | Engine shall detect bruising and physical damage. | Should |
| FR-3.7 | Analysis results shall be stored per assessment with confidence values. | Must |

### 3.4 Module 4 — Freshness Assessment Engine

| Req ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Compute freshness score (0–100) per item/batch. | Must |
| FR-4.2 | Estimate spoilage probability (%). | Must |
| FR-4.3 | Classify into categories: Fresh, Good, Acceptable, Near Spoilage, Spoiled. | Must |
| FR-4.4 | Maintain freshness trend history per item over time. | Should |

### 3.5 Module 5 — Shelf-Life Prediction

| Req ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Predict remaining shelf life using inputs: food images, product type, storage temperature, humidity, packaging type, storage duration. | Must |
| FR-5.2 | Forecast expiry date with confidence interval. | Must |
| FR-5.3 | Analyze storage condition impact on shelf life. | Should |
| FR-5.4 | Provide risk forecasting (early spoilage likelihood). | Should |

### 3.6 Module 6 — Storage Condition Monitoring

Parameters tracked: Temperature, Humidity, Air Circulation, Light Exposure, Storage Duration.

| Req ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Record temperature readings (manual or sensor via MQTT). | Must |
| FR-6.2 | Record humidity readings. | Must |
| FR-6.3 | Track environmental exposure (light, air circulation). | Should |
| FR-6.4 | Validate storage compliance against per-category thresholds. | Must |
| FR-6.5 | Generate storage optimization recommendations. | Must |

### 3.7 Module 7 — Freshness Scoring Engine (Weighted Model)

```
Freshness Score = Visual Condition Analysis (40%)
               + Storage Conditions        (25%)
               + Shelf-Life Prediction     (20%)
               + Product Age               (15%)
```

| Req ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | Implement weighted composite score exactly as specified above. | Must |
| FR-7.2 | Produce component sub-scores (visual, storage, shelf-life, age). | Must |
| FR-7.3 | Produce overall food health score and confidence score. | Should |

### 3.8 Module 8 — Recommendation Engine

| Req ID | Recommendation Type | Priority |
|---|---|---|
| FR-8.1 | Storage recommendations (temperature/humidity adjustments) | Must |
| FR-8.2 | Consumption recommendations (consume-first prioritization) | Must |
| FR-8.3 | Inventory rotation suggestions (FIFO/risk-based) | Should |
| FR-8.4 | Waste reduction recommendations | Should |
| FR-8.5 | Quality improvement suggestions | Could |

### 3.9 Module 9 — Dashboards & Analytics

| Dashboard | Required Views |
|---|---|
| Consumer | Freshness reports, shelf-life estimates, storage recommendations, inventory overview |
| Retail | Product freshness analytics, inventory quality monitoring, shelf-life alerts, waste reduction insights |
| Warehouse | Storage compliance monitoring, inventory health tracking, batch freshness reports, environmental analytics |
| Admin | User management, platform analytics, system monitoring, reporting management |

### 3.10 Module 10 — Notifications & Alerts

Alert types: freshness alerts, shelf-life warnings, spoilage notifications, storage condition alerts, inventory alerts, platform notifications. Delivery: in-app (Must), email (Should).

### 3.11 Module 11 — Reports & Export

Report types: freshness, shelf-life, inventory quality, waste reduction, storage compliance. Export formats: PDF (Must), Excel/XLSX (Must).

### 3.12 Module 12 — Integration, Testing & Deployment

Frontend-backend integration, API validation testing, E2E workflow tests, security testing, performance optimization, Docker containerization, production deployment, monitoring/logging setup, documentation and user guides.

---

## 4. External Interfaces

### 4.1 REST API Endpoints (indicative)

```
POST   /api/v1/auth/register          Register user
POST   /api/v1/auth/login             Obtain JWT
POST   /api/v1/auth/oauth2/callback   OAuth2 callback
GET    /api/v1/users/me               Profile
GET    /api/v1/items                  List food items
POST   /api/v1/items                  Create food item
POST   /api/v1/batches                Create batch
POST   /api/v1/images/upload          Upload food image
POST   /api/v1/assessments            Run freshness assessment
GET    /api/v1/freshness/{itemId}     Get freshness scores/trends
GET    /api/v1/shelflife/{itemId}     Shelf-life prediction
POST   /api/v1/storage/readings       Submit storage readings
GET    /api/v1/recommendations        Fetch recommendations
GET    /api/v1/dashboards/{role}      Role dashboard aggregates
GET    /api/v1/alerts                 List alerts
GET    /api/v1/reports?format=pdf|xlsx Generate/export reports
```

All protected routes require `Authorization: Bearer <JWT>`; roles enforced server-side.

### 4.2 Database Interfaces
- **PostgreSQL:** users, roles, food_items, batches, assessments, freshness_scores, shelf_life_predictions, storage_readings, alerts, audit logs.
- **MongoDB:** image metadata, raw analysis outputs, unstructured event/notification documents, model artifacts metadata.

### 4.3 Hardware Interfaces (Optional)
MQTT broker ingesting temperature/humidity sensor telemetry mapped to batches/storage zones.

---

## 5. Non-Functional Requirements

| ID | Category | Requirement | Measure |
|---|---|---|---|
| NFR-01 | Performance | API response time | < 500 ms typical endpoints |
| NFR-02 | Performance | Dashboard loading speed | < 3 s first load |
| NFR-03 | Performance | Prediction latency | < 5 s per image analysis |
| NFR-04 | Capacity | Concurrent users | Stable under target load (define baseline ≥ 100 concurrent) |
| NFR-05 | Security | AuthN/AuthZ | JWT + OAuth2; RBAC enforced server-side |
| NFR-06 | Security | Secrets management | Env vars / secret manager; no hardcoded credentials |
| NFR-07 | Accuracy | Freshness classification accuracy | Target ≥ 85% (tune to dataset) |
| NFR-08 | Accuracy | Spoilage detection accuracy | Target ≥ 90% |
| NFR-09 | Accuracy | Shelf-life prediction MAE | Minimize; report per category |
| NFR-10 | Maintainability | CI/CD | GitHub Actions pipeline green before merge |
| NFR-11 | Portability | Deployment parity | Docker Compose identical local/prod topology |

## 6. Evaluation Criteria (Acceptance)

**Milestone 1 (Week 2):** Project initialized; authentication implemented; inventory management functional; freshness datasets integrated.
**Milestone 2 (Week 4):** Freshness assessment engine operational; image analysis workflows functional; quality scoring implemented.
**Milestone 3 (Week 6):** Shelf-life prediction operational; recommendation engine functional; analytics and monitoring workflows complete.
**Milestone 4 (Week 8):** Frontend+backend fully deployed; dashboards and reporting operational; end-to-end workflow demonstrated.

## 7. Verification Methods
Unit tests (pytest/Jest), integration/API tests (Postman collections), E2E workflow tests, security testing (auth bypass, injection), performance/load testing, model evaluation (accuracy, MAE, confusion matrices).
