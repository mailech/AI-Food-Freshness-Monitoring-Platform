# AI Food Freshness Monitoring Platform

An AI-powered web application developed as part of the Infosys internship project for monitoring food freshness, shelf life, storage conditions, alerts, recommendations, and reports.

## Features

- Authentication and Role-Based Access Control
- Inventory and food-batch management
- AI-based food freshness analysis
- Shelf-life prediction
- Composite freshness scoring
- Storage condition monitoring
- Storage compliance and configurable storage rules
- Automatic alerts and recommendations
- Reports and export
- PostgreSQL database integration

## User Roles

| Role | Main Responsibility |
|---|---|
| Consumer | Food image freshness analysis |
| Retail Manager | Inventory and retail operations |
| Warehouse Operator | Storage and warehouse operations |
| Food Quality Inspector | Food quality and inspection |
| Administrator | System configuration and administration |

The Administrator role is intentionally hidden from the normal login-role dropdown.

## Technology Stack

- **Frontend:** React.js, Vite, JavaScript, CSS
- **Backend:** Python, FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL
- **Machine Learning:** TensorFlow, Scikit-learn, OpenCV, NumPy, Pandas

## AI Freshness Analysis

The trained image classification model supports:

- Fresh Apple
- Rotten Apple
- Fresh Banana
- Rotten Banana
- Fresh Orange
- Rotten Orange

### Model

ml/artifacts/final_food_freshness_model.keras
freshapples
rottenapples
freshbanana
rottenbanana
freshoranges
rottenoranges
Other food types are outside the current trained model scope.

**Shelf-Life Prediction**

The shelf-life model uses:

Storage duration
Mean temperature
Mean relative humidity
Door-opening count

###Model
ml/artifacts/shelf_life_model.joblib
The application does not assign an unsupported time unit to the model output.
**Freshness Scoring**

The composite freshness score uses:
| Component          | Weight |
| ------------------ | -----: |
| Visual Freshness   |    40% |
| Storage Conditions |    25% |
| Shelf-Life         |    20% |
| Product Age        |    15% |


Storage Monitoring

The system monitors:

Temperature
Humidity
Air circulation
Light level
Storage duration
Door openings

It provides storage compliance, alerts, recommendations, and storage history.

Configurable storage rules are available for:

Fruits
Vegetables
Dairy
Meat & Poultry
Seafood
Bakery
Packaged Foods
Beverages

The configured storage thresholds are project-specific prototype policies and are not universal food-safety standards.

**Reports and Export**

Authorized users can generate reports containing relevant inventory, freshness, storage, and quality information.

Supported exports:

PDF
CSV/Excel-compatible export

**Project Structure**
Food_Monitoring_Final/
│
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── uploads/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── ml/
│   └── artifacts/
│
└── README.md

**Setup
Prerequisites**

**Install the following:**

Python 3.13
Node.js
npm
PostgreSQL
Backend Setup

**From the project root:**
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

**Configure the PostgreSQL database connection and JWT settings in:**
backend/.env

**Database Setup**
After configuring backend/.env, run:
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head

**FRONTEND SETUP**
cd frontend
npm install

**BACKEND SETUP**
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
