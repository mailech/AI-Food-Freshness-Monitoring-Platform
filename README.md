# FreshGuard AI - Food Freshness & Shelf-Life Monitoring Platform

An enterprise platform for AI-assisted Food Freshness Detection, Shelf-Life Prediction, Storage Sensor Telemetry, and Waste Reduction Management.

## Demo MVP Overview

The demo platform provides a complete end-to-end workflow:
**Login → Dashboard → Add Food Item → Upload Image → Run AI Freshness Inspection → View Freshness Scorecard → View Shelf-Life Horizon → Monitor Storage Microclimates → Review Operational Recommendations → Export Compliance Reports.**

---

## Tech Stack

- **Frontend**: React.js 18, Vite, Tailwind CSS, Lucide React, Chart.js, React-Chartjs-2
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic v2
- **Architecture**: Clean Service Layer with modular AI inference interface (`ai_service.py`) ready for PyTorch / TensorFlow / YOLO model plug-in.

---

## Quick Start

### 1. Backend Setup & Run
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1
```
- API Health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend Setup & Run
```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## Demo Personas

| Role | Email | Password |
|---|---|---|
| **Food Quality Inspector** | `elena.inspector@freshguard.io` | `demo123` |
| **Retail Manager** | `marcus.retail@freshguard.io` | `demo123` |
| **Warehouse Operator** | `sam.warehouse@freshguard.io` | `demo123` |
| **Administrator** | `admin@freshguard.io` | `demo123` |
| **Consumer** | `consumer@freshguard.io` | `demo123` |

---

## License
MIT License