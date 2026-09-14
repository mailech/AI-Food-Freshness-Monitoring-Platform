# AI-Food-Freshness-Monitoring-Platform# 🍎

An AI-powered computer vision platform designed to analyze food quality, detect spoilage indicators (such as mold, surface texture degradation, and discoloration), estimate remaining shelf-life, and provide intelligent storage and consumption recommendations to reduce food waste.

---

## 📌 Features & Modules Implemented

1. **User Authentication & Role-Based Access Control (RBAC)**
   - Registration, login with JWT authentication
   - Roles supported: `Consumer`, `RetailManager`, `WarehouseOperator`, `FoodQualityInspector`, `Administrator`
   - User profile management
2. **Food Inventory Management**
   - Food item registration & batch management
   - Categorization (Fruits, Vegetables, Dairy, Meat & Poultry, Seafood, Bakery, Packaged Foods, Beverages)
   - Expiry tracking & inventory stats
3. **Food Image Analysis Engine**
   - Image upload & processing
   - Color analysis (HSV/RGB histograms, discoloration detection)
   - Texture analysis (Entropy, edge density, smoothness)
   - Spoilage indicators: Mold detection, Bruising detection, Damage detection
4. **Freshness Assessment & Scoring Engine**
   - Weighted scoring model: Visual Condition (40%), Storage Conditions (25%), Shelf-Life Prediction (20%), Product Age (15%)
   - Freshness categories: `Fresh`, `Good`, `Acceptable`, `Near Spoilage`, `Spoiled`
   - Quality confidence scoring & risk level assignment
5. **Shelf-Life Prediction Module**
   - Remaining shelf-life estimation based on storage decay curves
   - Expiry forecasting & storage impact analysis
6. **Storage Condition Monitoring**
   - Temperature & humidity tracking
   - Storage compliance validation & recommendations
7. **Recommendation Engine**
   - Storage & consumption guidelines
   - Inventory rotation (FIFO) & waste reduction strategies
8. **Dashboard & Analytics**
   - Role-adaptive dashboards for Consumers, Retail Managers, Warehouse Operators, and Admins
   - Interactive charts (Recharts) for trends & distributions
9. **Notification & Alert System**
   - Real-time alerts for freshness drops, shelf-life warnings, and storage non-compliance
10. **Reports & Export System**
    - Freshness & inventory quality reports
    - PDF export (ReportLab) & Excel export (OpenPyXL)

---

## 🛠️ Technology Stack

- **Backend**: Python, FastAPI, Uvicorn, SQLAlchemy (SQLite), JWT (python-jose), Pillow, NumPy, ReportLab, OpenPyXL
- **Frontend**: React 19, Vite, React Router v7, Recharts, Axios, Custom Dark Glassmorphism CSS Design System

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app:app --reload --port 8000
```
- API Base: `http://127.0.0.1:8000`
- Interactive Docs (Swagger): `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- React Frontend: `http://127.0.0.1:5173`
