# AI Food Freshness Monitoring Platform

This repository contains the Infosys internship project for monitoring food freshness, storage conditions, and shelf life.

## Current milestone

Milestone 1 foundation is in place:

- React and Vite frontend in `frontend/`
- FastAPI backend in `backend/`
- Reserved folders for machine learning, database work, and documentation

Authentication, PostgreSQL integration, inventory models, and role-based access will be added incrementally after this foundation is confirmed.

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