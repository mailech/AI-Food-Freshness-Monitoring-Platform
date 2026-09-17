🍎 AI Food Freshness Monitoring Platform

An AI-powered food freshness monitoring platform designed to help monitor food inventory, storage conditions, quality inspections, expiry risk, and freshness status. The system provides role-based dashboards, explainable AI freshness analysis, alerts, recommendations, and operational reports to support food-quality monitoring and reduce waste.

📌 Features & Modules Implemented
1. User Authentication & Role-Based Access Control (RBAC)
JWT-based registration and login
Common login page for all supported roles
Five supported roles:
Consumer
Retail Manager
Warehouse Operator
Food Quality Inspector
Administrator
Role-specific dashboards and navigation
Protected frontend pages and backend API authorization
User profile and settings management
Secure logout with token removal
2. Food Inventory Management
Add and manage food inventory items
Batch and category information
Supported categories:
Fruits
Vegetables
Dairy
Meat & Poultry
Seafood
Bakery
Packaged Foods
Beverages
Quantity and expiry-date tracking
Inventory statistics and operational monitoring
Food image upload support
3. AI Food Freshness Analysis
Explainable rule-based freshness assessment engine
Food image upload and preview
Image-based visual freshness signal
Expiry and shelf-life risk analysis
Storage temperature and humidity impact
Smell and texture assessment
Freshness score and confidence level
Analysis history stored in PostgreSQL
Freshness states:
Fresh
Good
Attention
Critical
4. Freshness Assessment & Scoring Engine
Combines multiple food-quality factors
Expiry risk calculation
Temperature penalty analysis
Humidity penalty analysis
Visual condition evaluation
Smell and texture contribution
Explainable factors showing why a score was assigned
Recommendations generated from the resulting freshness condition
5. Shelf-Life & Expiry Monitoring
Remaining shelf-life monitoring
Expiry-date tracking
Near-expiry identification
Expired-food alerts
Inventory rotation recommendations
Operational attention points for at-risk products
6. Storage Condition Monitoring
Temperature monitoring
Humidity monitoring
Storage reading history
Storage condition compliance checks
Detection of unsuitable temperature/humidity conditions
Storage-related recommendations and alerts
7. Quality Inspection Module
Record food-quality inspections
Visual quality observations
Smell assessment
Texture assessment
Inspection score tracking
Inspection history
Role-based access for quality operations
8. Recommendation Engine
Food storage recommendations
Consumption guidance
Inventory rotation suggestions
FIFO-oriented recommendations
Waste reduction actions
Recommendations based on freshness, expiry, and storage conditions
9. Dashboard & Analytics
Role-adaptive dashboards for all five user roles
Inventory overview
Freshness statistics
Storage condition information
Quality inspection information
Alert summaries
AI freshness analysis information
Recommendations and operational insights
10. Notification & Alert System
Expired food alerts
Near-expiry alerts
Freshness-risk alerts
Storage temperature alerts
Storage humidity alerts
Quality inspection alerts
Inventory rotation alerts
Administrator operational/system alerts
Role-specific alert visibility
Seeded operational alert data for testing and demonstration
11. Reports & Analytics
Freshness status reports
Inventory quality reports
Category-level analysis
Storage-condition trend graphs
Quality-inspection trend graphs
KPI summaries
Plain-language management summaries
PostgreSQL-backed operational reporting
Report refresh functionality
🛠️ Technology Stack
Backend
Python 3.13
Flask
PostgreSQL
PyJWT
psycopg2
Pillow
NumPy
python-dotenv
Rule-based explainable AI freshness engine
Frontend
HTML5
CSS3
JavaScript
Responsive dashboard UI
Custom glassmorphism-style interface
Role-based navigation and protected pages
Database
PostgreSQL 17
Database: foodfresh_ai
Authentication
JWT access tokens
Role-Based Access Control (RBAC)
Protected frontend routes
Protected backend endpoints
🚀 Getting Started
1. Prerequisites

Install:

Python 3.13
PostgreSQL 17
Git
A modern web browser
2. Backend Setup

Open PowerShell or Command Prompt:

cd backend

Create the virtual environment:

py -3.13 -m venv venv

Activate it on Windows:

.\venv\Scripts\Activate.ps1

Install dependencies:

python -m pip install --upgrade pip
pip install -r requirements.txt

Create the environment file:

notepad .env

Configure your PostgreSQL connection and JWT secret in .env.

Example:

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/foodfresh_ai
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000

Initialize the database schema:

python setup_db.py

Seed the database with sample users and operational data:

python seed.py

Start the backend:

python app.py

API Base URL:

http://127.0.0.1:5000

Keep the backend terminal running while using the application.

3. Frontend Setup

The frontend is served by the Flask application.

After starting the backend, open:

http://127.0.0.1:5000

The main login page is:

http://127.0.0.1:5000/index.html

No separate npm install or Vite server is required for this version.

👤 Supported Roles
Role	Main Access
Consumer	Dashboard, My Food, Alerts, Reports, Recommendations, Settings
Retail Manager	Dashboard, Inventory, Storage, Quality Inspection, AI Analysis, Alerts, Reports, Recommendations, Settings
Food Quality Inspector	Dashboard, AI Analysis, Quality Inspection, Inventory, Alerts, Reports, Recommendations, Settings
Administrator	Dashboard, Users, AI Analysis, Inventory, Storage, Quality Inspection, Alerts, Reports, Recommendations, Settings
Warehouse Operator	Dashboard, Inventory, Storage, Quality Inspection, AI Analysis, Alerts, Reports, Recommendations, Settings
🔐 Demo Accounts

The project includes seeded accounts for testing.

Password for all demo accounts:

Password@123
Role	Email
Consumer	consumer@foodfresh.local
Retail Manager	manager@foodfresh.local
Food Quality Inspector	inspector@foodfresh.local
Administrator	admin@foodfresh.local
Warehouse Operator	warehouse@foodfresh.local

Demo accounts are seeded in the database but are not displayed on the login page.

🤖 AI Freshness Analysis

The current implementation uses an explainable rule-based freshness engine rather than a trained machine-learning model.

The analysis considers factors such as:

Food expiry status
Remaining shelf life
Storage temperature
Storage humidity
Visual image signal
Smell assessment
Texture assessment

The system produces:

Freshness score
Freshness state
Confidence
Contributing factors
Recommended action

Uploaded food images are supported in:

JPG
PNG
WebP

Maximum image upload size:

8 MB

Analysis results and history are persisted in PostgreSQL.

📊 Reports

The Reports module provides:

Freshness KPI cards
Freshness-status graphs
Category-wise inventory graphs
Storage-condition trends
Quality-inspection trends
Operational summaries
Management-friendly text insights

All report information is generated from the application's PostgreSQL data.

🚨 Alerts

The Alerts module provides operational attention points such as:

Expired products
Products approaching expiry
Low freshness
Storage temperature problems
Storage humidity problems
Quality inspection issues
Stock rotation requirements
Administrative operational alerts

The project includes seeded alert/operational data so the Alerts section can be tested immediately after database seeding.

🗄️ Database

The application uses PostgreSQL database:

foodfresh_ai

Main database entities include:

Users
Inventory
Storage Readings
Quality Inspections
AI Analysis History
Recommendations / Operational Data

The database is created and initialized using:

python setup_db.py

Sample data is loaded using:

python seed.py
🖥️ Windows Quick Start

From the project root:

cd D:\FoodFresh_AI_Updated_Final

Then start the application using the included Windows startup script:

.\start_windows.bat

Or start manually:

cd backend
.\venv\Scripts\Activate.ps1
python app.py

Then open:

http://127.0.0.1:5000
🔒 Security
Passwords are stored using secure password hashing
JWT authentication is used for sessions
Backend endpoints enforce role permissions
Protected pages reject unauthenticated access
Logout clears stored authentication data
Sensitive environment values are stored in .env
.env, virtual environments, and generated Python cache files are excluded through .gitignore
📁 Project Structure
FoodFresh_AI_Updated_Final/
│
├── frontend/
│   ├── index.html
│   ├── register.html
│   ├── dashboard.html
│   ├── inventory.html
│   ├── storage.html
│   ├── inspection.html
│   ├── analysis.html
│   ├── alerts.html
│   ├── reports.html
│   ├── recommendations.html
│   ├── settings.html
│   ├── profile.html
│   ├── admin.html
│   ├── app.js
│   ├── auth.js
│   ├── pages.js
│   └── styles.css
│
├── backend/
│   ├── app.py
│   ├── auth.py
│   ├── db.py
│   ├── schema.sql
│   ├── seed.py
│   ├── setup_db.py
│   ├── requirements.txt
│   └── .env.example
│
├── start_windows.bat
└── README.md
✅ Final Verification

After starting the application, verify:

✓ Registration works for all five roles
✓ Login routes users to the correct dashboard
✓ Role-based navigation is displayed correctly
✓ Protected pages block unauthorized access
✓ Inventory data persists
✓ Storage readings persist
✓ Quality inspections persist
✓ AI analysis results persist
✓ Food images can be uploaded
✓ Alerts contain operational data
✓ Reports display graphs and summaries
✓ Recommendations load correctly
✓ Profile and settings work
✓ Logout returns to the login page
✓ PostgreSQL data remains available after restarting the backend
📌 Project Summary

AI Food Freshness Monitoring Platform is a full-stack food-quality monitoring application combining:

Authentication
        ↓
Role-Based Dashboards
        ↓
Inventory Management
        ↓
Storage Monitoring
        ↓
Quality Inspection
        ↓
AI Freshness Analysis
        ↓
Alerts & Recommendations
        ↓
Reports & Analytics
        ↓
PostgreSQL Persistence

This implementation is designed for demonstration, academic projects, operational prototypes, and further extension into a production computer-vision freshness prediction system.
