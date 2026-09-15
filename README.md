# AI Food Freshness Monitoring Platform

This repository contains the Infosys internship project for monitoring food freshness, storage conditions, and shelf life.

## Current submission scope

The project includes a React/Vite frontend, FastAPI/PostgreSQL backend, authentication and role-based access control, inventory, storage, recommendations, alerts, reports/export, freshness analysis, and freshness-score workflows.

The trained image classifier at `ml/artifacts/final_food_freshness_model.keras` is integrated into Freshness Analysis. It is byte-identical to `best_frozen_model.keras`; the verified class order is `freshapples`, `rottenapples`, `freshbanana`, `rottenbanana`, `freshoranges`, and `rottenoranges`. It does not support strawberries or other products; the application presents its output as a raw model class in those cases.

The trained shelf-life pipeline at `ml/artifacts/shelf_life_model.joblib` is integrated using `dwell_hours`, `mean_temp_F`, `mean_rh_pct`, and `door_opens_count`. Its raw numeric output is stored and displayed with `unit not established`; the application does not invent a time unit. Composite freshness is calculated only when all four real 0–100 components are available: visual (40%), storage (25%), shelf-life (20%), and product age (15%). The visual component maps a supported model's `fresh*`/`rotten*` class to 100/0 without using model confidence; product age is the remaining proportion of the recorded purchase-to-expiry interval. Storage readings have no configured category thresholds and shelf-life output has no established unit, so either missing interpretation yields the explicit `score_unavailable` state rather than a fabricated composite.

### Composite scoring prototype policy

The deployed prototype replaces the earlier unavailable-only behavior. It calculates `0.40 * visual + 0.25 * storage + 0.20 * shelf-life + 0.15 * product age`. Visual maps supported `fresh*`/`rotten*` classes to 100/0 without using confidence. Product age is the remaining proportion of the recorded purchase-to-expiry interval. The demo fruit-storage policy uses Fahrenheit temperature scores of <=40: 100, 41-45: 90, 46-50: 75, 51-60: 50, and >60: 20; humidity scores of 90-95: 100, 85-89: 90, 75-84: 75, 60-74: 60, <60: 40, and >95: 70. Storage is `0.60 * temperature + 0.40 * humidity`; Storage Monitoring Celsius readings are converted to Fahrenheit, otherwise recorded Fahrenheit shelf-life model inputs are an explicitly labelled fallback.

The shelf-life artifact does not establish a unit, so raw output remains labelled `unit not established` and is never displayed as days. Its component uses configurable prototype normalization `100 * (raw_output - 0) / 30`, clamped to 0-100. The temperature/humidity thresholds and 0-30 range are prototype demo policy, not claims about the model target unit, and can later be replaced by category-specific validated policy.

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
