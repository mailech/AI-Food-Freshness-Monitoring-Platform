# AI-Powered Food Freshness Monitoring Platform

## 📌 Project Overview

The **AI-Powered Food Freshness Monitoring Platform** is an intelligent full-stack web application designed to monitor food freshness, identify spoilage, estimate shelf life, manage food inventory, monitor storage conditions, generate recommendations, provide timely alerts, and generate analytical reports.

The platform combines **Artificial Intelligence, Computer Vision, Machine Learning, environmental condition monitoring, inventory management, and web technologies** to provide an integrated solution for food quality monitoring and food waste reduction.

Users can upload food images for AI-based freshness analysis, monitor freshness scores and shelf-life information, track storage conditions, manage inventory and batches, receive alerts, view recommendations, and analyze food-quality information through role-specific dashboards.

The system follows a **role-based architecture** and provides separate dashboards for:

- Consumer
- Retail Manager
- Warehouse Operator
- Food Quality Inspector
- Administrator

---

# 🎯 Objectives

The main objectives of the project are:

- To provide AI-based food freshness analysis.
- To identify fresh, acceptable, near-spoilage, and spoiled food conditions.
- To generate an overall freshness score.
- To estimate the remaining shelf life of food products.
- To monitor food storage conditions such as temperature and humidity.
- To manage food inventory and batch information.
- To monitor product expiry dates.
- To identify expired and near-expiry food products.
- To generate timely freshness, storage, and expiry alerts.
- To provide storage and inventory recommendations.
- To provide role-specific dashboards.
- To generate detailed freshness, shelf-life, inventory, storage, and waste reports.
- To support better inventory rotation and food management.
- To contribute towards reducing avoidable food waste.

---

# ✨ Key Features

## 🔐 1. User Authentication & Authorization

The platform provides authentication and role-based access control.

Features include:

- User registration
- User login
- Password hashing
- JWT-based authentication
- Google OAuth authentication
- Protected API endpoints
- Role-based dashboard access
- User profile management
- Secure logout

### Supported Roles

- Consumer
- Retail Manager
- Warehouse Operator
- Food Quality Inspector
- Administrator

---

# 🤖 2. AI-Based Food Freshness Analysis

Users can upload food images through the Food Analysis module.

The system performs AI-based analysis and provides information such as:

- Food type
- Freshness status
- AI confidence
- Freshness score
- Estimated shelf life
- Food handling recommendation

The freshness analysis helps users identify the current quality condition of food and take appropriate action.

### Freshness Classification

The platform supports freshness categories such as:

- **Fresh**
- **Good**
- **Acceptable**
- **Near Spoilage**
- **Spoiled**

---

# 📊 3. Weighted Freshness Score

The platform generates an overall freshness score on a scale of **0 to 100**.

The freshness score combines multiple factors instead of relying only on the visual appearance of the food.

| Factor | Weight |
|---|---:|
| Visual Freshness | 40% |
| Storage Conditions | 25% |
| Shelf Life | 20% |
| Product Age | 15% |
| **Total** | **100%** |

### Freshness Score Formula

```text
Freshness Score =
    (Visual Freshness × 0.40)
  + (Storage Score × 0.25)
  + (Shelf-Life Score × 0.20)
  + (Product Age Score × 0.15)
