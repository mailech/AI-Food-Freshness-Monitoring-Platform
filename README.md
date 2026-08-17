# FreshLens - AI-Powered Food Freshness Monitoring Platform

FreshLens is an enterprise-grade AI-powered platform designed to estimate food freshness, predict remaining shelf life, detect spoilage risk, and recommend handling optimizations. It integrates relational bulk inventory logs, visual computer vision diagnostic scanners, time-series IoT telemetry monitoring, and role-based notification alerts.

---

## System Architecture Overview

FreshLens uses a modular modern technology stack:
* **Frontend**: Next.js (App Router, Tailwind CSS v4, dynamic SVG concentric gauges, 3D card perspective tilt animations).
* **Backend**: FastAPI (Python 3.13, SQLAlchemy ORM for PostgreSQL, Beanie ODM for MongoDB, pure-python request rate-limiting).
* **Databases**:
  * **PostgreSQL**: Stores relational user structures, supply batches, and inventory logs.
  * **MongoDB**: Stores time-series storage telemetry readings, visual specimen analyses, and system alerts.
  * **Redis**: Coordinates rate limiting and telemetry query caches.

---

## Monorepo Layout

```text
d:\FreshLens\
├── docker-compose.yml        # Multi-container orchestration (Postgres, Mongo, Redis, API, UI)
├── README.md                 # Setup, run, and test guide
├── backend/                  # FastAPI Backend service
│   ├── Dockerfile
│   ├── requirements.txt      # Production dependencies (FastAPI, SQLAlchemy, ReportLab, openpyxl, pillow)
│   ├── requirements-dev.txt  # Testing dependencies (pytest, pytest-asyncio)
│   ├── alembic/              # Database migration history
│   └── app/                  # FastAPI Application codebase
│       ├── core/             # Configuration, security, database, and rate limiting
│       ├── modules/          # Auth, inventory, image analysis, scoring, storage, recommendations, alerts, reports
│       └── tests/            # Test suites (pytest modules & end-to-end critical path integration test)
└── frontend/                 # Next.js App Router client
    ├── Dockerfile
    ├── package.json
    └── src/app/              # Web pages (landing, dashboards, alerts, reports hub)
```

---

## Local Setup & Installation

Ensure you have **Python 3.13**, **Node.js 20+**, and **Docker Desktop** installed.

### 1. Backend Local Setup
From the root directory:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
python -m uvicorn app.main:app --reload
```
* **Interactive OpenAPI docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 2. Frontend Local Setup
From another terminal:
```powershell
cd frontend
npm install
npm run dev
```
* **Dashboard Portal**: [http://localhost:3000](http://localhost:3000)

### 3. Run Automated Tests
With the virtual environment active in the `backend` folder:
```powershell
python -m pytest app/tests/ -v
```

---

## Run with Docker Compose

You can launch the complete production-configured system using Docker:
```bash
docker compose up --build
```
This deploys the complete network stack:
- PostgreSQL on port `5432`
- MongoDB on port `27017`
- Redis on port `6379`
- FastAPI Backend on port `8000`
- Next.js Web UI on port `3000`
