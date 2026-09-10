# AI Food Freshness Monitoring Platform

This repository contains the Infosys internship project for monitoring food freshness, storage conditions, and shelf life.

## Current submission scope

The project includes a React/Vite frontend, FastAPI/PostgreSQL backend, authentication and role-based access control, inventory, storage, recommendations, alerts, reports/export, freshness analysis, and freshness-score workflows.

The trained image classifier at `ml/artifacts/final_food_freshness_model.keras` is integrated into Freshness Analysis. It is byte-identical to `best_frozen_model.keras`; the verified class order is `freshapples`, `rottenapples`, `freshbanana`, `rottenbanana`, `freshoranges`, and `rottenoranges`. It does not support strawberries or other products; the application presents its output as a raw model class in those cases.

The trained shelf-life pipeline at `ml/artifacts/shelf_life_model.joblib` is integrated using `dwell_hours`, `mean_temp_F`, `mean_rh_pct`, and `door_opens_count`. Its raw numeric output is stored and displayed with `unit not established`; the application does not invent a time unit. Composite freshness scores remain unavailable until all required real component values exist.

## Run the frontend

```powershell
Set-Location frontend
npm run dev
```

## Run the backend

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The backend health check is available at `http://127.0.0.1:8000/health`.

Copy `backend/.env.example` to `backend/.env`, configure PostgreSQL and a JWT secret, then apply the Alembic migrations before running the backend. Install backend dependencies with `pip install -r requirements.txt`; TensorFlow and Pillow are required for image inference.
