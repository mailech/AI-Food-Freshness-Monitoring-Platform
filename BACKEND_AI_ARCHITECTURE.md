# Food Freshness Monitoring Platform — Backend & AI Architecture

## 1. System Architecture Overview

```
                          +-------------------------+
                          |   React Frontend (Vite)  |
                          |   (Port 5173 / Port 80) |
                          +------------+------------+
                                       |
                                       | HTTP REST API (multipart/form-data & JSON)
                                       v
                          +-------------------------+
                          |   FastAPI Backend API   |
                          |   (Port 8000)           |
                          +---+--------+--------+---+
                              |        |        |
             +----------------+        |        +----------------+
             |                         |                         |
             v                         v                         v
+-------------------------+ +---------------------+ +-------------------------+
|   PostgreSQL Database   | | Scoring & Rec Engine| |   AI Service (FastAPI)  |
|   (Port 5432)           | | - Freshness Score   | |   (Port 8001)           |
| - users                 | |   (40/25/20/15)     | | - EfficientNetB0        |
| - foods & batches       | | - Storage Rules     | |   Inference Engine      |
| - food_images & analysis| | - Modular Shelf-Life| | - Fruit Classifier      |
| - predictions & alerts  | | - Rec Engine        | | - Preprocessing         |
+-------------------------+ +---------------------+ +------------+------------+
                                                                 |
                                                                 v
                                                      +---------------------+
                                                      | Trained ML Weights  |
                                                      | - freshness_model   |
                                                      | - class_names.json  |
                                                      +---------------------+
```

---

## 2. Layer Responsibilities & Design Patterns

### A. Frontend Layer (`frontend/`)
- **Technology**: React 19, Vite, Tailwind CSS, Lucide React, Chart.js.
- **Role**: Visual inspection dashboard, real-time telemetry gauges, manual image upload, inventory CRUD, and alert notifications.
- **Contract Preservation**: Connects transparently to `POST /api/food/analyze`, displaying genuine ML confidence, spoilage probability, and actionable recommendations.

### B. Backend API Layer (`backend/app/api/`)
- **Technology**: FastAPI, Python 3.11+, Pydantic v2.
- **Role**:
  - Request validation and multipart image uploading.
  - Orchestration between AI microservice, business scoring logic, and database persistence.
  - Endpoints:
    - `POST /api/food/analyze` (Aliases: `/api/analysis`)
    - `GET/POST/PUT/DELETE /api/foods`
    - `GET /api/storage` & `/api/storage/trends`
    - `GET /api/recommendations`
    - `GET/PUT /api/alerts`
    - `GET /api/dashboard`
    - `GET/POST /api/reports`
    - `POST /api/auth/login` & `/api/auth/register`

### C. AI Microservice Layer (`ai-service/`)
- **Technology**: FastAPI, PyTorch 2.x, Torchvision, EfficientNetB0.
- **Separation of Concerns**: Training pipelines (`ai-service/training/`) and inference pipelines (`ai-service/app/`) remain strictly isolated.
- **Lifecycle Loading**: The model weights (`freshness_model.pth`) and class mappings are loaded into RAM **once at startup** in the FastAPI lifespan handler, providing sub-100ms inference latencies.

### D. Scoring & Recommendation Engines (`backend/app/services/`)
1. **Freshness Score Calculation**:
   $$\text{Score} = (\text{Visual Score} \times 0.40) + (\text{Storage Score} \times 0.25) + (\text{Shelf-Life Score} \times 0.20) + (\text{Age Score} \times 0.15)$$
2. **Storage Quality Scoring**:
   Evaluates deviations from optimal temperature and humidity ranges per food category (Fruits, Vegetables, Dairy, Meat, Seafood, Bakery).
3. **Recommendation Engine**:
   Deterministic rule generation for Storage, Consumption, Inventory Rotation (FIFO/FEFO), and Spoilage Waste Diversion.

### E. Relational Database Layer (`backend/app/models/orm.py`)
- **Technology**: PostgreSQL with SQLAlchemy ORM (with automatic dev fallback to SQLite).
- **Tables**:
  - `users`: User identity and inspector profiles.
  - `foods`: Active inventory tracking.
  - `food_batches`: Supplier batch and harvest telemetry.
  - `food_images`: Stored image files and MIME metadata.
  - `food_analysis`: Historical analysis sessions.
  - `freshness_predictions`: Real ML probability logs and latency metrics.
  - `storage_conditions`: Live cold-chain sensor zones.
  - `shelf_life_predictions`: Remaining life forecasts.
  - `recommendations`: Actionable quality recommendations.
  - `alerts`: System notifications and temperature spikes.
  - `reports`: Weekly quality audits.

---

## 3. How to Run Everything

### Option 1: Docker Compose (All-in-One)
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- AI Microservice: `http://localhost:8001`
- PostgreSQL: `localhost:5432`

### Option 2: Local Development Execution

#### 1. Start AI Microservice
```bash
cd ai-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

#### 2. Start Backend API
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 3. Start React Frontend
```bash
cd frontend
npm run dev
```

#### 4. Run Automated Tests
```bash
# Backend unit tests
cd backend && python -m unittest discover tests

# AI Service unit tests
cd ai-service && python -m unittest discover tests
```
