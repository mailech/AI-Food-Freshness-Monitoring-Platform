🍎 FreshCheck -- AI Food Freshness Monitoring Platform

An AI-powered web platform for monitoring food freshness, shelf life,
inventory, analytics, reports, notifications, and recommendations
using Deep Learning and Computer Vision.

📌 Overview

FreshCheck is an AI-based Food Freshness Monitoring Platform
designed to help users monitor food freshness and shelf life through an
integrated web application.

The current version provides:

User registration and login

JWT-based authentication

Role-based authorization support

Food image upload and AI freshness scanning

Food type and freshness prediction

AI confidence score

Shelf-life and expiry-date tracking

PostgreSQL-based food data storage

Food inventory management

Dashboard monitoring

Analytics

Freshness and expiry-related notifications

Reports

Food recommendations

Profile and settings pages

Food record deletion

Docker-based deployment

🎯 Project Objectives

Detect food freshness using Artificial Intelligence.

Monitor food condition and shelf life.

Provide an easy-to-use food inventory system.

Store food monitoring information in a database.

Provide dashboard-based monitoring and analytics.

Provide freshness-related notifications and recommendations.

Build a containerized application using Docker.

✨ Main Features

🔐 Authentication & Authorization

FreshCheck includes user authentication and protected API communication.

Features include:

User registration

User login

JWT authentication

Password hashing

Bearer-token API authentication

Token validation and expiration handling

Role-based authorization support

Protected frontend pages

The authentication middleware is implemented in:

backend/auth_middleware.py

It provides a reusable token_required() decorator that can validate
authenticated users and restrict selected routes by role.

📷 Add Food & AI Scan

Users can add food by uploading a food image.

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

🤖 AI Food Freshness Detection

FreshCheck uses a Deep Learning model for image-based food freshness
classification.

Model:

ml/model/food_freshness_final.keras

Supported classes:

Fresh Apple
Fresh Banana
Fresh Orange
Rotten Apple
Rotten Banana
Rotten Orange

The prediction process returns the detected food/freshness class and an
AI confidence score.

Example:

Food: Banana
Status: Fresh
AI Confidence: 95%
Shelf Life: 5 Days

🧠 Machine Learning

The ML component is located inside:

ml/
├── model/
│   └── food_freshness_final.keras
├── class_names.json
└── predict.py

food_freshness_final.keras --- trained Keras model

class_names.json --- model class mapping

ml/predict.py --- prediction logic

The backend also contains prediction-related logic in:

backend/predict.py

📊 Dashboard

The Dashboard provides an overview of the monitored food data.

It can display information such as:

Fresh items

Expiring items

Spoiled/rotten items

Food inventory

AI confidence

Shelf life

Food status

📦 Inventory

The Inventory module displays saved food records and supports food
inventory monitoring.

Food records contain information such as:

Food name

Category

Scanned date

Expiry date

Shelf life

AI confidence

Status

📈 Analytics

The Analytics module provides data-based insights from the stored food
records and freshness information.

🔔 Notifications

The Notifications module provides freshness-related alerts and warning
information for monitored food items.

📄 Reports

The Reports module provides report-oriented food monitoring information
and retrieves report data from the backend.

💡 Recommendations

FreshCheck now includes a dedicated Recommendations module:

frontend/recommendations.html
frontend/recommendations.js

Recommendations are retrieved from the authenticated backend endpoint:

GET /api/recommendations

The interface supports:

All

Alerts

Warnings

Information

Recommendations can display freshness states such as:

Fresh

Warning

Rotten

👤 Profile & Settings

The application includes:

User profile

Profile information

Application settings

Logout functionality

🏗️ System Architecture

                         ┌──────────────────────┐
                         │        USER          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      FRONTEND        │
                         │   HTML / CSS / JS    │
                         └──────────┬───────────┘
                                    │
                              HTTP / REST API
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   FLASK BACKEND      │
                         │ Authentication/API   │
                         └──────┬───────┬───────┘
                                │       │
                   ┌────────────┘       └─────────────┐
                   ▼                                  ▼
          ┌─────────────────┐                ┌─────────────────┐
          │   AI / ML Model │                │   PostgreSQL    │
          │ TensorFlow/Keras│                │    Database     │
          └─────────────────┘                └─────────────────┘
                   │                                  │
                   └────────────────┬─────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │ Dashboard / Inventory│
                         │ Analytics / Reports  │
                         │ Notifications /      │
                         │ Recommendations      │
                         └──────────────────────┘

📁 Project Structure

AI-Food-Freshness-Monitoring-Platform/
│
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── predict.py
│   ├── auth_middleware.py
│   ├── database.py
│   ├── requirements.txt
│   ├── instance/
│   │   └── freshcheck.db
│   └── uploads/
│
├── frontend/
│   ├── Dashboard.html
│   ├── dashboard.js
│   ├── add-food.html
│   ├── add-food.js
│   ├── inventory.html
│   ├── analytics.html
│   ├── notifications.html
│   ├── notifications.js
│   ├── reports.html
│   ├── reports.js
│   ├── recommendations.html
│   ├── recommendations.js
│   ├── profile.html
│   ├── profile.js
│   ├── settings.html
│   ├── settings.js
│   ├── login.js
│   ├── signup.html
│   ├── signup.js
│   ├── forgotpass.html
│   ├── logout.html
│   └── auth-check.js
│
├── ml/
│   ├── model/
│   │   └── food_freshness_final.keras
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

🛠️ Technologies Used

Area                   Technology

Frontend               HTML5
Styling                CSS3
Client-side            JavaScript
Backend                Python
Web Framework          Flask
API                    REST API
Authentication         JWT
Password Security      Flask-Bcrypt
ORM                    Flask-SQLAlchemy
AI                     TensorFlow
Deep Learning          Keras
Image Processing       Pillow
Numerical Processing   NumPy
Database               PostgreSQL
Previous Database      SQLite
Web Server             Nginx
Containerization       Docker
Orchestration          Docker Compose
Version Control        Git / GitHub

🔌 API Endpoints

Health Check

GET /

Returns:

FreshCheck Backend is running

Authentication

POST /api/auth/register
POST /api/auth/login

Used for user registration and login.

AI Prediction

POST /predict
POST /api/predict

Used to process an uploaded food image and return an AI prediction.

Food Management

POST /api/food
GET /api/food
GET /foods
DELETE /api/food/<id>

Used to create, retrieve, and delete food records.

Dashboard

GET /api/dashboard

Provides data used by the Dashboard.

Recommendations

GET /api/recommendations

Returns authenticated food recommendations.

Reports

GET /api/reports/data

Returns report data for the Reports module.

🗄️ Database

The Docker deployment uses PostgreSQL as the primary database.

The food data model includes fields such as:

id
food_name
category
scanned_date
expiry_date
shelf_life_days
ai_confidence
status
created_at

Example:

Food Name: Banana
Category: Fruits
Status: Fresh
AI Confidence: 0.95
Shelf Life: 5 Days

🔄 Data Flow

User
 ↓
Add Food
 ↓
Upload Image
 ↓
AI Prediction
 ↓
Freshness + Confidence
 ↓
Shelf-Life Calculation
 ↓
Flask Backend
 ↓
PostgreSQL
 ↓
Dashboard / Inventory
 ↓
Analytics / Reports
 ↓
Notifications / Recommendations

🐳 Docker

FreshCheck is containerized using Docker and Docker Compose.

Main Docker files:

Dockerfile.backend
Dockerfile.frontend
docker-compose.yml
nginx.conf

Docker Services

Frontend
  └── Nginx
      Port: 8080

Backend
  └── Flask
      Port: 5000

Database
  └── PostgreSQL
      Port: 5432

Start the Application

Make sure Docker Desktop is running.

docker compose up -d --build

Check Containers

docker compose ps

Stop the Application

docker compose down

Avoid docker compose down -v when you want to preserve the
PostgreSQL Docker volume.

🌐 Local Access

Frontend:

http://127.0.0.1:8080

Backend:

http://127.0.0.1:5000

🚀 Installation & Setup

1. Clone the Repository

git clone https://github.com/mailech/AI-Food-Freshness-Monitoring-Platform.git

2. Enter the Project

cd AI-Food-Freshness-Monitoring-Platform

3. Start with Docker

docker compose up -d --build

4. Verify

docker compose ps

Then open:

http://127.0.0.1:8080

🔐 Authentication Flow

User
 ↓
Signup / Login
 ↓
Flask Backend
 ↓
Credential Verification
 ↓
JWT Token
 ↓
Browser Storage
 ↓
Authenticated API Request
 ↓
JWT Middleware
 ↓
User / Role Validation
 ↓
Protected API Access

The frontend sends the JWT token using the
Authorization: Bearer <token> header when calling protected APIs.

🔒 Security

The current application includes:

JWT authentication

Password hashing

Protected API requests

Token validation

Token expiration handling

Role-based authorization support

CORS configuration

For production deployment, additional measures should be considered,
including:

Environment-based secrets

Strong database credentials

HTTPS

Secure JWT configuration

Production WSGI server

Input validation

File-upload validation

Rate limiting

🧪 Database Verification

Example PostgreSQL commands:

docker compose exec database psql -U freshcheck -d freshcheck -c "\dt"

View food records:

docker compose exec database psql -U freshcheck -d freshcheck -c "SELECT * FROM food_item;"

Count food records:

docker compose exec database psql -U freshcheck -d freshcheck -c "SELECT COUNT(*) FROM food_item;"

📈 Future Improvements

Possible future improvements include:

More food categories

Improved Deep Learning accuracy

More accurate shelf-life prediction

Improved storage-condition recommendations

Sensor and IoT integration

Temperature and humidity monitoring

Real-time camera-based freshness detection

Cloud deployment

Mobile application

Advanced analytics

More detailed role permissions

🎓 Project Learning Outcomes

This project provides practical experience with:

Programming

Python

JavaScript

HTML

CSS

SQL

Backend

Flask

REST APIs

JWT authentication

Role-based authorization

SQLAlchemy

Database integration

AI / ML

Image classification

Deep Learning

TensorFlow

Keras

Image preprocessing

Model prediction

Confidence scores

Database

PostgreSQL

SQLite

SQL

Database migration

DevOps

Docker

Docker Compose

Docker volumes

Nginx

Container networking

Software Development

Git

GitHub

Branch management

Debugging

API testing

Full-stack integration

👩‍💻 Author

Sayantika Mahanta

BCA Student
Aspiring Data Analyst / Data Scientist

GitHub:
https://github.com/Sayantikamahanta02

📌 Project Repository

AI-Food-Freshness-Monitoring-Platform

GitHub:
https://github.com/mailech/AI-Food-Freshness-Monitoring-Platform

⭐ Project Summary

FreshCheck combines:

Frontend
   +
Flask Backend
   +
JWT Authentication
   +
Deep Learning
   +
PostgreSQL
   +
Docker
   +
Nginx

to create an end-to-end AI Food Freshness Monitoring Platform.

The system demonstrates how Artificial Intelligence, web development,
authentication, database management, and containerization can be
integrated into a practical food freshness monitoring application.

❤️ Thank You

Thank you for visiting the FreshCheck project.