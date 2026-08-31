# System Architecture Document
## AI-Powered Food Freshness Monitoring Platform

Version 1.0

---

## 1. Architectural Overview

The platform follows a **layered, service-oriented monolith-to-modular design** (modular FastAPI backend + React SPA frontend), containerized with Docker and deployed to AWS/Azure.

```
┌────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                              │
│   Consumer / Retail / Warehouse / Admin — React.js + Next.js SPA   │
│              Tailwind CSS · Chart.js · Plotly                      │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ HTTPS (REST/JSON, JWT Bearer)
┌──────────────────────────▼─────────────────────────────────────────┐
│                        API GATEWAY (FastAPI)                       │
│  Auth Middleware (JWT/OAuth2) · RBAC Guards · Rate Limiting        │
│  Request Validation (Pydantic) · Logging & Error Handling          │
├────────────────────────────────────────────────────────────────────┤
│                      APPLICATION SERVICE LAYER                     │
│ ┌──────────────┐ ┌───────────────┐ ┌────────────┐ ┌─────────────┐ │
│ │ Auth Service │ │ Inventory Svc │ │ Dashboard  │ │ Alert &     │ │
│ │ (JWT/OAuth2/ │ │ (items,batches│ │ Analytics  │ │ Notification│ │
│ │  RBAC/Users) │ │  categories)  │ │ Service    │ │ Service     │ │
│ └──────────────┘ └───────────────┘ └────────────┘ └─────────────┘ │
│ ┌──────────────┐ ┌───────────────┐ ┌────────────┐ ┌─────────────┐ │
│ │ Image        │ │ Freshness     │ │ Shelf-Life │ │ Recommend-  │ │
│ │ Analysis Svc │ │ Assessment    │ │ Prediction │ │ ation Svc   │ │
│ │ (upload,CV)  │ │ Engine        │ │ Module     │ │             │ │
│ └──────────────┘ └───────────────┘ └────────────┘ └─────────────┘ │
│ ┌──────────────────────┐  ┌───────────────────────────────────┐  │
│ │ Storage Monitoring   │  │ Scoring Engine                    │  │
│ │ (temp/humidity/MQTT) │  │ Visual40%·Storage25%·Shelf20%·Age │  │
│ └──────────────────────┘  └───────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                         ML / CV LAYER                              │
│  CNN classifiers (fresh/spoiled) · YOLO detection · OpenCV color & │
│  texture analysis · Scikit-learn regression (shelf life)           │
│  Frameworks: TensorFlow / PyTorch · Pandas / NumPy · augmentation  │
├────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                                │
│  PostgreSQL: users, roles, items, batches, assessments, alerts     │
│  MongoDB: image metadata, raw CV outputs, events, model registry   │
│  Object/File storage: uploaded food images                         │
├────────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE LAYER                           │
│  Docker Compose · GitHub Actions CI/CD · AWS/Azure                 │
│  Monitoring & logging stack                                        │
│  (Optional) MQTT Broker ← Temp/Humidity Sensors                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 API Gateway (FastAPI)
- Route versioning under `/api/v1`.
- JWT verification middleware; OAuth2 token exchange.
- RBAC dependency injection per route (`Depends(require_role(...))`).
- Pydantic schemas for request/response validation.
- Centralized exception handlers and structured JSON logging.

### 2.2 Auth Service
- Registration, login, refresh tokens, password hashing (bcrypt).
- OAuth2 provider integration.
- User profile CRUD; admin user management endpoints.

### 2.3 Inventory Service
- Food item registration, categorization (8 categories), batch management.
- Expiry tracking and inventory queries with filters/pagination.

### 2.4 Image Analysis Service
- Receives uploads; stores files; enqueues analysis job.
- Pipeline: preprocess → classify (CNN fresh/spoiled) → detect defects (YOLO) → color histogram degradation (OpenCV) → texture features → aggregate result with confidences.

### 2.5 Freshness Assessment Engine
- Consumes image analysis output + product metadata.
- Outputs: freshness score (0–100), category (Fresh/Good/Acceptable/Near Spoilage/Spoiled), spoilage probability, quality class, trend series.

### 2.6 Shelf-Life Prediction Module
- Regression model (scikit-learn) using inputs: images-derived visual state, product type, temperature, humidity, packaging type, storage duration.
- Outputs remaining shelf life, expiry forecast, risk level, confidence.

### 2.7 Storage Monitoring Service
- Ingests manual readings or MQTT sensor telemetry.
- Validates against per-category thresholds; flags violations; emits storage optimization recommendations.

### 2.8 Scoring Engine
Weighted composite:
```
Freshness Score = 0.40 × VisualConditionScore
                + 0.25 × StorageConditionsScore
                + 0.20 × ShelfLifePredictionScore
                + 0.15 × ProductAgeScore
```
Each component normalized to 0–100 before weighting.

### 2.9 Recommendation Engine
Rule-based + score-driven rules producing: storage, consumption, rotation, waste-reduction, quality-improvement recommendations.

### 2.10 Alert & Notification Service
- Evaluates thresholds/scores to raise freshness, shelf-life, spoilage, storage-condition, inventory, and platform notifications.
- Delivery channels: in-app (v1), email (optional).

### 2.11 Dashboard/Analytics Service
- Aggregations powering the four role dashboards via read-optimized queries.

### 2.12 Reports Service
- Generates freshness/shelf-life/inventory-quality/waste/compliance reports; exports PDF and Excel.

---

## 3. Data Architecture

### 3.1 PostgreSQL Schema (core tables)

```
users(id PK, email UNIQUE, password_hash, oauth_provider, full_name,
      role_id FK, is_active, created_at)
roles(id PK, name)  -- consumer | retail_manager | warehouse_operator |
                    -- quality_inspector | administrator
food_items(id PK, owner_id FK, name, category_id FK, packaging_type,
           created_at)
food_categories(id PK, name)  -- 8 categories
batches(id PK, item_id FK, batch_code, quantity, received_date,
        expiry_date, storage_location)
image_uploads(id PK, item_id FK, file_path, uploaded_by, uploaded_at)
assessments(id PK, item_id FK, batch_id FK, image_id FK,
            freshness_score, freshness_category, spoilage_probability,
            quality_class, assessed_at)
shelf_life_predictions(id PK, assessment_id FK, predicted_days_remaining,
                       forecast_expiry_date, confidence, risk_level,
                       created_at)
storage_readings(id PK, batch_id FK, temperature_c, humidity_pct,
                 air_circulation, light_exposure, recorded_at, source
                 )  -- source: manual|sensor
alerts(id PK, type, severity, target_role, ref_table, ref_id, message,
       is_read, created_at)
audit_logs(id PK, actor_id, action, entity, entity_id, created_at)
```

### 3.2 MongoDB Collections
- `cv_outputs`: raw per-image analysis payloads (color histograms, detections, feature vectors).
- `events`: platform notification/event stream.
- `model_registry`: model versions, metrics, artifact paths.

### 3.3 File Storage
Uploaded images stored on disk volume or cloud object storage; metadata in PostgreSQL.

---

## 4. Data Flow — Core Workflow

1. **Upload:** Client posts food image → API validates → file stored → row in `image_uploads`.
2. **Analyze:** Image Analysis pipeline runs CNN/YOLO/OpenCV → result stored in Mongo (`cv_outputs`) + summarized in Postgres (`assessments`).
3. **Assess:** Freshness Assessment computes score/category/probability → persisted.
4. **Predict:** Shelf-life module consumes assessment + storage readings + metadata → prediction persisted.
5. **Score:** Scoring engine combines weighted components → overall health score.
6. **Recommend:** Recommendation engine generates actionable suggestions.
7. **Alert:** Threshold breaches create alerts; users notified.
8. **Report/Dashboard:** Analytics service aggregates for dashboards; Reports export PDF/XLSX.

---

## 5. Security Architecture

- **AuthN:** JWT access tokens (short-lived) + refresh tokens; optional OAuth2.
- **AuthZ:** Server-side role checks on every protected endpoint; UI hides unauthorized actions only as a convenience layer.
- **Data protection:** bcrypt password hashing; TLS in transit; secrets via environment variables/cloud secret manager.
- **Input hardening:** Pydantic validation, upload MIME/size checks, parameterized ORM queries (SQLAlchemy).
- **Auditing:** audit_logs for sensitive actions.

## 6. Deployment Architecture

```
GitHub ──push──▶ GitHub Actions CI
                   ├─ lint + unit tests
                   ├─ build Docker images (api, web, worker)
                   └─ push to container registry
                        │
                        ▼
             Cloud Host (AWS EC2/ECS or Azure App Service/ACI)
   ┌────────────── Docker Compose / Orchestrator ──────────────┐
   │  nginx (reverse proxy)                                    │
   │  web (React build served by nginx/static CDN)             │
   │  api (FastAPI + Uvicorn workers)                          │
   │  worker (ML inference jobs)                               │
   │  postgres ▸ volume   mongo ▸ volume   mqtt-broker (opt.)  │
   └───────────────────────────────────────────────────────────┘
                        │
                        ▼
            Monitoring & logging (cloud logs/metrics dashboards)
```

## 7. Technology Decisions & Rationale

| Choice | Rationale |
|---|---|
| FastAPI | Async performance, automatic OpenAPI docs, Pydantic validation |
| React + Next.js | Component reuse, SSR options, ecosystem maturity |
| PostgreSQL | Relational integrity for inventory/auth/assessments |
| MongoDB | Flexible schema for CV outputs/events |
| TensorFlow/PyTorch + YOLO/CNN | Proven CV classification/detection |
| OpenCV | Color/texture feature engineering |
| Scikit-learn | Interpretable shelf-life regression |
| MQTT (optional) | Lightweight IoT sensor ingestion |
| Docker + GH Actions | Environment parity, automated CI/CD |

## 8. Scalability Considerations
- Stateless API enables horizontal scaling behind load balancer.
- ML inference isolated in worker service; can scale independently.
- Read-heavy dashboard queries can move to materialized views/caches.
- Object storage offloads image serving from app servers.

## 9. Failure Modes & Handling
| Failure | Handling |
|---|---|
| Model inference timeout | Job queue with retries; return pending status |
| DB unavailable | Graceful 503 + health checks; orchestrator restart |
| Sensor data gap | Mark readings stale; fall back to last known/manual input |
| Upload failure | Client-side validation + resumable retry |

## 10. Observability
Structured JSON logs (request IDs), health endpoints (`/healthz`, `/readyz`), metrics (API latency, queue depth, prediction latency), alerting on error rates.
