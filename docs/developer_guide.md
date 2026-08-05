# Developer Guide — AI Food Freshness Monitoring Platform

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Python | 3.10+ |
| Node.js | 18+ |
| Docker Desktop | 24+ |
| PostgreSQL | 15 (via Docker) |
| MongoDB | 6 (via Docker) |

---

## Local Development Setup

### 1. Clone & Setup

```bash
cd "AI_Food Freshness Monitoring Platform"
cp .env.example .env
```

### 2. Python Virtual Environment

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 3. Train AI Models (One-time)

```bash
cd ai
python train.py
# Creates: models/food_freshness_cnn.pth
#          models/shelf_life_regressor.pth
cd ..
```

### 4. Start Services (PostgreSQL, MongoDB, Redis)

Using Docker for just the services:
```bash
docker-compose up db mongo redis -d
```

### 5. Initialize Database & Seed

```bash
# Tables are auto-created on backend startup.
# Run seed data after backend starts:
python scripts/seed_data.py
```

### 6. Start Backend

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 7. Start Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## Code Organization

### Backend Layers

```
Request → FastAPI Router → Service Layer → SQLAlchemy Model → PostgreSQL
                       ↘ MongoDB (Logs)
                       ↘ Celery (Async)
                       ↘ AI Engine (Inference)
```

### Key Design Patterns

- **Repository Pattern**: All database queries go through SQLAlchemy ORM models
- **Service Layer**: Business logic is isolated in `backend/services/`
- **Dependency Injection**: Database sessions and user auth injected via FastAPI `Depends()`
- **Pydantic Schemas**: All request/response bodies validated through `backend/schemas/`

### Adding a New Route

1. Create router in `backend/routes/my_feature.py`
2. Add schemas to `backend/schemas/pydantic_schemas.py`
3. Register router in `backend/main.py` with `app.include_router(...)`

### Adding a New Frontend Page

1. Create page in `frontend/src/pages/MyPage.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add sidebar link in `frontend/src/components/DashboardLayout.tsx`

---

## AI Model Development

### Training New Models

```bash
# Edit ai/dataset_loader.py to adjust synthetic data
# Edit ai/models.py to modify architecture
# Then re-train:
cd ai && python train.py

# Evaluate performance:
python evaluate.py
```

### Inference Integration

The `AIInferencePipeline` class in `ai/inference.py` is initialized once when the backend starts. It automatically loads weights from `models/` if they exist.

### Adding a New Food Category

1. Add to `CATEGORIES` list in `ai/dataset_loader.py`
2. Update base color mapping in `SyntheticFoodDataset.__getitem__`
3. Add category to `food_categories` table INSERT in `database/init_postgres.sql`
4. Retrain models

---

## Environment Variables Reference

See [`.env.example`](../.env.example) for full list with descriptions.

---

## Running Tests

```bash
# All tests
python -m pytest tests/ -v

# AI unit tests only
python -m pytest tests/test_ai.py -v

# API integration tests only
python -m pytest tests/test_api.py -v

# With coverage
python -m pytest tests/ --cov=backend --cov=ai --cov-report=html
open htmlcov/index.html
```

---

## Linting & Formatting

```bash
# Python (backend + AI)
pip install ruff
ruff check backend/ ai/

# TypeScript (frontend)
cd frontend
npm run lint
```
