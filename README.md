# AI-Powered Food Freshness Monitoring Platform

## 📌 Project Overview

The **AI-Powered Food Freshness Monitoring Platform** is an intelligent web-based application designed to help users monitor food freshness, identify spoilage, manage food inventory, track storage conditions, receive timely alerts, and generate detailed reports.

The platform combines **Artificial Intelligence, Machine Learning, web development, and database technologies** to provide an integrated solution for food quality monitoring and food waste reduction.

Users can upload food images for AI-based freshness analysis, monitor storage conditions, manage inventory and expiry information, receive alerts, and view analytical reports through a simple and user-friendly interface.

---

## 🎯 Objectives

The main objectives of the project are:

- To provide AI-based food freshness analysis.
- To identify whether food is fresh or spoiled.
- To generate an overall freshness score.
- To estimate the remaining shelf life of food.
- To monitor food storage conditions.
- To manage food inventory and expiry information.
- To generate timely freshness, storage, and expiry alerts.
- To provide recommendations for better food handling and storage.
- To generate detailed analytical reports.
- To support food waste reduction through timely decision-making.

---

## ✨ Key Features

### 🔐 1. User Authentication

The platform provides secure authentication and access management features:

- User registration
- User login
- Password hashing
- JWT-based authentication
- Google OAuth authentication
- Role-based access control

---

### 🤖 2. AI-Based Food Freshness Analysis

Users can upload a food image through the dashboard for AI-based analysis.

The system provides:

- Food identification
- Freshness status
- AI confidence
- Freshness score
- Estimated shelf life
- Food handling recommendation

This helps users make quick and informed decisions about food quality.

---

### 📊 3. Freshness Scoring

The platform generates an overall freshness score on a scale of **0 to 100**.

The score provides a simple indication of the current quality condition of the analyzed food.

---

### 📅 4. Shelf-Life Estimation

The system provides an estimated remaining shelf life for analyzed food.

This helps users understand when food should preferably be consumed and supports better food management.

---

### 🌡️ 5. Storage Monitoring

Users can enter and monitor important storage conditions such as:

- Temperature
- Humidity

The system evaluates the entered conditions and classifies the overall storage condition as:

- **Good**
- **Warning**
- **Critical**

This helps users identify unsuitable storage conditions that may affect food quality.

---

### 📦 6. Inventory Management

Users can maintain their food inventory by recording:

- Food name
- Category
- Quantity
- Batch number
- Purchase date
- Expiry date

The inventory system also identifies food items based on expiry status:

- Good
- Expiring Soon
- Expired

---

### 🚨 7. Dynamic Alerts

The platform automatically generates alerts based on important food and storage conditions.

Alerts can be generated for:

- Spoiled food
- Low freshness conditions
- Critical storage conditions
- Expired food items
- Food items approaching expiry

This enables users to take timely action.

---

### 📈 8. Dashboard Analytics

The dashboard provides a centralized view of food freshness monitoring.

It displays:

- Images uploaded
- Fresh food detected
- Spoiled food detected
- Model accuracy
- Recent prediction history
- Latest food analysis results
- Storage information

---

### 📑 9. Reports and Analytics

The platform provides multiple reports for monitoring and analysis:

- **Freshness Report**
- **Shelf-Life Report**
- **Inventory Quality Report**
- **Storage Compliance Report**
- **Waste Reduction Report**

Freshness reports can be exported in:

- PDF format
- Excel format

---

## 🔄 Application Workflow

```text
User Registration / Login
          ↓
       Dashboard
          ↓
   Upload Food Image
          ↓
    AI-Based Analysis
          ↓
 Freshness Assessment
          ↓
   Freshness Score
          ↓
 Shelf-Life Estimation
          ↓
Storage Condition Analysis
          ↓
 Recommendations & Alerts
          ↓
 Inventory Management
          ↓
 Reports & Analytics
```

---

## 🛠️ Technologies Used

### Frontend

- **React.js** – User interface development
- **Vite** – Frontend development and build tool
- **JavaScript** – Application logic
- **HTML5** – Web page structure
- **CSS3** – User interface styling

### Backend

- **Python** – Backend and AI development
- **FastAPI** – REST API development
- **SQLAlchemy** – Database interaction
- **JWT** – Secure user authentication
- **Google OAuth** – Social authentication
- **Starlette Sessions** – Session management

### Database

- **PostgreSQL** – User and inventory data management

### Artificial Intelligence & Machine Learning

- **TensorFlow**
- **Keras**
- **NumPy**
- **Pandas**
- **Scikit-learn**

These technologies are used for image-based food analysis, data processing, and AI-related functionality.

### Reporting & Data Export

- **jsPDF** – PDF report generation
- **SheetJS (XLSX)** – Excel report generation

### Development & Testing Tools

- **Visual Studio Code**
- **Git**
- **GitHub**
- **Postman**

---

## 📁 Project Structure

```text
AI-Food-Freshness-Monitoring-Platform/
│
├── backend/
│   ├── database/
│   │
│   ├── models/
│   │   ├── food.py
│   │   └── user.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   ├── food.py
│   │   └── prediction.py
│   │
│   ├── security.py
│   └── main.py
│
├── ml/
│   ├── train_model.py
│   └── test_v3.py
│
├── public/
│
├── src/
│   ├── pages/
│   │   ├── Alerts.jsx
│   │   ├── Dashboard.jsx
│   │   ├── FreshnessReport.jsx
│   │   ├── Inventory.jsx
│   │   ├── InventoryQualityReport.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Reports.jsx
│   │   ├── ShelfLifeReport.jsx
│   │   ├── StorageComplianceReport.jsx
│   │   ├── StorageMonitoring.jsx
│   │   └── WasteReductionReport.jsx
│   │
│   ├── App.jsx
│   ├── App.css
│   └── OAuthSuccess.jsx
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

> Large datasets and trained model files are excluded from the GitHub repository using `.gitignore`.

---

## 📋 Main Application Modules

| Module | Description |
|---|---|
| Authentication | User registration, login and secure access |
| Dashboard | Centralized food freshness monitoring |
| AI Analysis | Food image analysis and freshness prediction |
| Freshness Scoring | Overall food quality score |
| Shelf-Life | Estimated remaining shelf life |
| Storage Monitoring | Temperature and humidity monitoring |
| Inventory | Food item and expiry management |
| Alerts | Freshness, storage and expiry alerts |
| Reports | Food, inventory, storage and waste reports |
| Export | PDF and Excel report generation |

---

## 🔒 Security Features

The platform includes security mechanisms such as:

- Password hashing
- JWT-based authentication
- Protected API endpoints
- Role-based access control
- OAuth authentication
- Authenticated inventory access
- Secure handling of user information

> Database credentials, authentication secrets, and other sensitive configuration values should be stored securely and should not be committed to the repository.

---

## 🚀 How to Run the Project

### 1. Clone the Repository

```bash
git clone https://github.com/mailech/AI-Food-Freshness-Monitoring-Platform.git
```

Switch to the project branch:

```bash
git checkout rihana
```

---

### 2. Install Frontend Dependencies

From the project root:

```bash
npm install
```

---

### 3. Start the Backend

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Start the FastAPI server:

```bash
python -m uvicorn main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

---

### 4. Start the Frontend

From the project root, run:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5175
```

---

### 5. Database Configuration

The application uses **PostgreSQL** for database operations.

Before starting the backend:

- Create the required PostgreSQL database.
- Configure the local database connection.
- Keep database credentials in local configuration.
- Do not upload passwords or sensitive credentials to GitHub.

---

## 📊 System Capabilities

The platform provides an integrated workflow covering:

```text
Authentication
      ↓
Food Image Analysis
      ↓
Freshness Assessment
      ↓
Freshness Score
      ↓
Shelf-Life Estimation
      ↓
Storage Monitoring
      ↓
Inventory Management
      ↓
Dynamic Alerts
      ↓
Reports & Analytics
```

This integration allows users to monitor food quality and make better decisions from a single platform.

---

## 💡 Benefits

The system helps users to:

- Identify food spoilage quickly.
- Monitor food quality efficiently.
- Make better food consumption decisions.
- Track food storage conditions.
- Manage food inventory and expiry dates.
- Receive timely alerts.
- Monitor food quality through reports.
- Reduce avoidable food wastage.
- Improve overall food management.

---

## 🔮 Future Enhancements

The platform can be further enhanced with:

- IoT-based temperature and humidity monitoring
- Real-time sensor integration
- Advanced spoilage detection
- Mold and bruising detection
- Support for additional food categories
- Advanced machine learning-based shelf-life prediction
- Real-time analytics
- Role-specific dashboards
- Inventory editing and deletion
- Automated email and SMS notifications
- Docker-based deployment
- Cloud deployment
- Real-time monitoring and notifications


---

## 🎓 Project Information

This project was developed as part of the **Infosys Springboard Internship**.

The project demonstrates the practical application of:

- Artificial Intelligence
- Machine Learning
- Web Development
- Backend API Development
- Database Management
- Authentication and Authorization
- Data Processing
- Reporting and Analytics

---

## 📌 Conclusion

The **AI-Powered Food Freshness Monitoring Platform** provides an integrated solution for monitoring food freshness, storage conditions, inventory, expiry information, alerts, and analytical reports.

By combining intelligent food analysis with practical food management features, the platform helps users monitor food quality, take timely action, improve food management, and contribute towards reducing food wastage.

---
