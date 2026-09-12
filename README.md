# AI-Food-Freshness-Monitoring-Platform

# 🍎 FreshCheck – AI Food Freshness Monitoring Platform

> An AI-powered web platform for monitoring food freshness, shelf life, inventory, and food status using Deep Learning and Computer Vision.

---

## 📌 Overview

**FreshCheck** is an AI-based Food Freshness Monitoring Platform developed to help users monitor the freshness and shelf life of fruits and vegetables.

The platform allows users to:

- Create an account and log in securely
- Upload food images
- Run an AI-based freshness scan
- Identify the food type and freshness status
- View AI confidence
- Calculate and monitor shelf life
- Save food information in a database
- Monitor food items through a dashboard
- Manage inventory
- View analytics and reports
- Receive freshness-related notifications
- Clear saved food data when required

The application is deployed using **Docker**, with **PostgreSQL** as the primary database.

---

# 🎯 Project Objectives

The main objectives of FreshCheck are:

1. Detect food freshness using Artificial Intelligence.
2. Reduce food waste by monitoring food condition.
3. Provide an easy-to-use food inventory system.
4. Track shelf life and expiry dates.
5. Store food monitoring information in a database.
6. Provide dashboard-based monitoring and analytics.
7. Build a containerized and reproducible application using Docker.

---

# ✨ Main Features

## 🔐 User Authentication

FreshCheck provides user authentication functionality.

Features include:

- User Registration
- User Login
- JWT-based authentication
- Password hashing
- Protected API communication
- User information storage

---

## 📷 Add Food

Users can add food to the monitoring system by uploading a food image.

### Flow

```text
Select Food Image
       ↓
Upload Image
       ↓
Run AI Scan
       ↓
AI Prediction
       ↓
Confidence Score
       ↓
Shelf-Life Information
       ↓
Save Food Item
       ↓
PostgreSQL Database
```

---

# 🤖 AI Food Freshness Detection

FreshCheck uses a Deep Learning model to analyze food images.

The model is stored as:

```text
ml/model/food_freshness_final.keras
```

The system predicts the food class and determines whether the food is fresh or rotten.

### Supported Classes

```text
Fresh Apple
Fresh Banana
Fresh Orange

Rotten Apple
Rotten Banana
Rotten Orange
```

The prediction also provides an AI confidence score.

Example:

```text
Food: Banana
Status: Fresh
AI Confidence: 95%
Shelf Life: 5 Days
```

---

# 🧠 Machine Learning

The Machine Learning component is located inside:

```text
ml/
```

### ML Components

```text
ml/
│
├── model/
│   └── food_freshness_final.keras
│
├── class_names.json
│
└── predict.py
```

### Model

The trained model is stored in Keras format:

```text
food_freshness_final.keras
```

### Class Names

The mapping between model output and food classes is stored in:

```text
class_names.json
```

### Prediction

The prediction logic is handled by:

```text
ml/predict.py
```

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │        USER          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      FRONTEND        │
                    │ HTML / CSS / JS      │
                    └──────────┬───────────┘
                               │
                         HTTP Requests
                               │
                               ▼
                    ┌──────────────────────┐
                    │       FLASK          │
                    │       BACKEND        │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────────┐ ┌────────────┐ ┌─────────────┐
        │ AI / ML      │ │ PostgreSQL │ │   Uploads   │
        │ TensorFlow   │ │ Database   │ │    Images   │
        │ Keras        │ │            │ │             │
        └──────────────┘ └────────────┘ └─────────────┘
                │              │
                └──────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Dashboard /      │
              │ Inventory /      │
              │ Analytics /      │
              │ Reports          │
              └──────────────────┘
```

---

# 📁 Project Structure

```text
AI-Food-Freshness-Monitoring-Platform/
│
├── backend/
│   │
│   ├── app.py
│   ├── models.py
│   ├── predict.py
│   ├── database.py
│   ├── requirements.txt
│   │
│   ├── instance/
│   │   └── freshcheck.db
│   │
│   └── uploads/
│
├── frontend/
│   │
│   ├── add-food.html
│   ├── add-food.js
│   │
│   ├── Dashboard.html
│   ├── dashboard.js
│   │
│   ├── inventory.html
│   ├── inventory.js
│   │
│   ├── analytics.html
│   ├── analytics.js
│   │
│   ├── notifications.html
│   ├── notifications.js
│   │
│   ├── reports.html
│   ├── reports.js
│   │
│   ├── settings.html
│   ├── settings.js
│   │
│   ├── login.html
│   ├── login.js
│   │
│   ├── signup.html
│   ├── signup.js
│   │
│   └── auth-check.js
│
├── ml/
│   │
│   ├── model/
│   │   └── food_freshness_final.keras
│   │
│   ├── class_names.json
│   └── predict.py
│
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── nginx.conf
├── .gitignore
├── .gitattributes
└── README.md
```

---

# 🖥️ Frontend

The frontend is built using:

- HTML5
- CSS3
- JavaScript
- Font Awesome
- Nginx

The frontend provides the user interface for the complete application.

## Main Frontend Pages

### 🔐 Login

Allows existing users to authenticate.

### 📝 Signup

Allows new users to create an account.

### ➕ Add Food

Allows users to:

- Upload food images
- Run AI scans
- View prediction
- View confidence
- View shelf life
- Save food items

### 📊 Dashboard

Displays an overview of monitored food.

Dashboard information includes:

- Fresh Items
- Expiring Soon
- Spoiled Items
- Food Inventory
- AI Confidence
- Shelf Life
- Food Status

### 📦 Inventory

Displays saved food items and allows inventory management.

### 📈 Analytics

Provides food monitoring insights and statistics.

### 🔔 Notifications

Provides freshness and expiry-related notifications.

### 📄 Reports

Provides food monitoring information in report form.

### ⚙️ Settings

Provides application settings and data management functionality.

---

# ⚙️ Backend

The backend is developed using **Python Flask**.

Main backend file:

```text
backend/app.py
```

The backend is responsible for:

- API endpoints
- Authentication
- Food item management
- AI prediction requests
- Database operations
- Image uploads
- Dashboard data
- Delete operations
- Clearing saved food data

---

# 🔌 API Endpoints

## Health Check

```http
GET /
```

Response:

```text
FreshCheck Backend is running
```

---

## AI Prediction

```http
POST /predict
```

Used to upload a food image and receive an AI prediction.

---

## Get Food Items

```http
GET /api/food
```

Returns saved food items.

---

## Add Food Item

```http
POST /api/food
```

Saves a food item in the database.

---

## Delete Food Item

```http
DELETE /api/food/<id>
```

Deletes an individual food item.

---

## Clear All Food Data

```http
DELETE /api/food/clear
```

Deletes all saved food items.

---

## Dashboard

```http
GET /api/dashboard
```

Provides food monitoring information used by the dashboard.

---

# 🗄️ Database

FreshCheck currently uses:

## PostgreSQL

PostgreSQL is the **primary database** in the Docker deployment.

The PostgreSQL database runs inside a Docker container.

Database configuration:

```text
Database: freshcheck
Username: freshcheck
Password: freshcheck123
Port: 5432
```

> For production deployment, database credentials should be stored using environment variables or secrets instead of hardcoding them.

---

# 📋 Food Item Data

The `food_item` table stores information such as:

```text
id
food_name
category
scanned_date
expiry_date
shelf_life_days
ai_confidence
status
created_at
```

Example:

```text
ID: 15
Food Name: cabbage
Category: Fruits
Status: Fresh
AI Confidence: 0.95
Shelf Life: 5 Days
```

---

# 🔄 Database Flow

```text
User
 ↓
Add Food
 ↓
AI Scan
 ↓
Prediction Result
 ↓
Food Information
 ↓
Flask Backend
 ↓
SQLAlchemy
 ↓
PostgreSQL
 ↓
Dashboard / Inventory
```

---

# 🐳 Docker

FreshCheck uses Docker to run the application components independently.

The project contains:

```text
Dockerfile.backend
Dockerfile.frontend
docker-compose.yml
nginx.conf
```

## Docker Services

### Backend

```text
freshcheck-backend
```

Runs Flask on:

```text
5000
```

### Frontend

```text
freshcheck-frontend
```

Runs Nginx on:

```text
8080
```

### Database

```text
freshcheck-database
```

Runs PostgreSQL on:

```text
5432
```

---

# 🐳 Docker Architecture

```text
                    Docker Compose
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ Frontend   │  │  Backend   │  │ PostgreSQL │
   │   Nginx    │  │   Flask    │  │            │
   │   :8080    │  │   :5000    │  │   :5432    │
   └────────────┘  └─────┬──────┘  └─────▲──────┘
                          │               │
                          └───────────────┘
```

---

# 💾 PostgreSQL Persistence

PostgreSQL data is stored using a Docker volume:

```text
postgres_data
```

The volume allows database data to survive container recreation.

Example:

```text
docker compose down
       ↓
Containers removed
       ↓
PostgreSQL volume remains
       ↓
docker compose up -d
       ↓
Database data remains
```

### ⚠️ Important

Do not use:

```bash
docker compose down -v
```

if you want to preserve PostgreSQL data.

The `-v` option removes the Docker volume.

---

# 🚀 Installation & Setup

## 1. Clone Repository

```bash
git clone https://github.com/mailech/AI-Food-Freshness-Monitoring-Platform.git
```

---

## 2. Enter Project Directory

```bash
cd AI-Food-Freshness-Monitoring-Platform
```

---

## 3. Start the Application

Make sure Docker Desktop is running.

Then:

```bash
docker compose up -d --build
```

---

## 4. Check Containers

```bash
docker compose ps
```

Expected services:

```text
freshcheck-backend
freshcheck-frontend
freshcheck-database
```

---

# 🌐 Access the Application

## Frontend

```text
http://127.0.0.1:8080
```

## Backend

```text
http://127.0.0.1:5000
```

---

# 🧪 Database Verification

## Check PostgreSQL Tables

```bash
docker compose exec database psql -U freshcheck -d freshcheck -c "\dt"
```

Expected tables include:

```text
food_item
user
```

---

## View Food Items

```bash
docker compose exec database psql -U freshcheck -d freshcheck -c "SELECT * FROM food_item;"
```

---

## Count Food Items

```bash
docker compose exec database psql -U freshcheck -d freshcheck -c "SELECT COUNT(*) FROM food_item;"
```

---

# 🔁 Restart Test

The application can be restarted using:

```bash
docker compose down
```

Then:

```bash
docker compose up -d
```

The PostgreSQL data remains available because the database uses a persistent Docker volume.

---

# 🗃️ SQLite Backup / Migration

Before PostgreSQL was introduced, FreshCheck used SQLite.

The previous SQLite database is located at:

```text
backend/instance/freshcheck.db
```

The project contains a migration script:

```text
backend/database.py
```

This script was used to migrate existing SQLite food records into PostgreSQL.

### ⚠️ Migration Warning

`database.py` is a **one-time migration script**.

Do not execute it repeatedly because it can create duplicate records in PostgreSQL.

---

# 🔐 Authentication Flow

```text
User
 ↓
Signup
 ↓
Flask Backend
 ↓
User Database
 ↓
Login
 ↓
JWT Token
 ↓
Browser Local Storage
 ↓
Authenticated API Requests
```

The frontend uses the authentication token when communicating with protected backend APIs.

---

# 📷 Food Monitoring Flow

The complete user workflow is:

```text
1. User Login
       ↓
2. Add Food
       ↓
3. Upload Image
       ↓
4. Run AI Scan
       ↓
5. AI Model Processes Image
       ↓
6. Food Class Predicted
       ↓
7. Fresh / Rotten Status
       ↓
8. AI Confidence
       ↓
9. Shelf Life
       ↓
10. Save Food
       ↓
11. PostgreSQL
       ↓
12. Dashboard
       ↓
13. Inventory / Analytics / Reports
```

---

# 📊 Example Prediction

```text
--------------------------------
        AI FOOD SCAN
--------------------------------

Food Name       : Cabbage
Category        : Vegetables
Status          : Fresh
AI Confidence   : 95%
Shelf Life      : 5 Days
--------------------------------
```

---

# 🧩 Technologies

| Area | Technology |
|---|---|
| Frontend | HTML5 |
| Styling | CSS3 |
| Client-side | JavaScript |
| Backend | Python |
| Web Framework | Flask |
| API | REST API |
| Authentication | JWT |
| Password Security | Flask-Bcrypt |
| ORM | Flask-SQLAlchemy |
| AI | TensorFlow |
| Deep Learning | Keras |
| Image Processing | Pillow |
| Numerical Processing | NumPy |
| Database | PostgreSQL |
| Previous Database | SQLite |
| Web Server | Nginx |
| Containerization | Docker |
| Orchestration | Docker Compose |
| Version Control | Git |
| Repository | GitHub |

---

# 🔧 Development Tools

The project can be developed and managed using:

- Visual Studio Code
- PowerShell
- Git
- GitHub
- Docker Desktop
- PostgreSQL
- Python

---

# 🛡️ Security Considerations

The project currently uses:

- JWT authentication
- Password hashing
- Protected API requests
- CORS configuration
- Docker-based service isolation

For production deployment, additional security improvements should be implemented, such as:

- Environment variables for secrets
- Strong database passwords
- HTTPS
- Secure JWT configuration
- Production WSGI server
- Input validation
- File upload validation
- Rate limiting

---

# ☁️ Deployment

The project is currently containerized using Docker.

The Docker architecture makes it possible to deploy the application to cloud platforms such as:

- AWS
- Microsoft Azure
- Google Cloud
- Other Docker-compatible hosting platforms

A future production deployment can use:

```text
Internet
   ↓
Cloud Server
   ↓
Nginx
   ↓
Frontend
   ↓
Flask Backend
   ↓
PostgreSQL
```

---

# 📈 Future Improvements

Future versions of FreshCheck may include:

- 📱 Mobile application
- 🌡️ Temperature sensor integration
- 💧 Humidity monitoring
- 📡 IoT integration
- MQTT-based sensor communication
- ☁️ Cloud deployment
- 🔔 Real-time notifications
- 📊 Advanced analytics
- 🧠 Improved Deep Learning models
- 📅 More accurate shelf-life prediction
- 👥 Multi-user inventory management
- 🏪 Smart food storage monitoring
- 📷 Real-time camera-based freshness detection

---

# 🎓 Project Learning Outcomes

Through this project, the following technologies and concepts were applied:

### Programming

- Python
- JavaScript
- HTML
- CSS
- SQL

### Backend Development

- Flask
- REST APIs
- Authentication
- Database integration
- SQLAlchemy

### AI / ML

- Image classification
- Deep Learning
- TensorFlow
- Keras
- Model prediction
- Confidence scores

### Database

- PostgreSQL
- SQLite
- SQL
- Database migration

### DevOps

- Docker
- Docker Compose
- Docker volumes
- Nginx
- Container networking

### Software Development

- Git
- GitHub
- Branch management
- Version control
- Debugging
- API testing

---

# 👩‍💻 Author

## Sayantika Mahanta

BCA Student  
Aspiring Data Analyst / Data Scientist

GitHub:

**https://github.com/Sayantikamahanta02**

---

# 📌 Project Repository

**AI-Food-Freshness-Monitoring-Platform**

GitHub:

**https://github.com/mailech/AI-Food-Freshness-Monitoring-Platform**

---

# ⭐ Project Summary

**FreshCheck** combines:

```text
Frontend
   +
Flask Backend
   +
Deep Learning
   +
PostgreSQL
   +
Docker
   +
Nginx
```

to create an end-to-end **AI Food Freshness Monitoring Platform**.

The system demonstrates how Artificial Intelligence can be integrated with a web application and database to provide practical food freshness and inventory monitoring.

---

## ❤️ Thank You

Thank you for visiting the FreshCheck project.

