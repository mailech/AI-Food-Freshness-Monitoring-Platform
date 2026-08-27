# FreshLens - 5-Minute Demonstration Script

This script outlines a 5-minute walkthrough of the FreshLens system to demonstrate features during reviews or presentations.

---

### 0:00–0:30 | Problem & Solution Introduction
* **Action**: Display the Landing Page of FreshLens.
* **Talking Points**: 
  - *"Welcome to FreshLens. Food waste is a massive global issue: up to 30% of fresh produce spoils before consumption. FreshLens addresses this by combining Computer Vision, IoT climate monitors, and automated FEFO (First Expired, First Out) warehouse logic to track food condition in real-time."*
  - *"Let's explore the portal."*

### 0:30–1:00 | Sign In & User Portals
* **Action**: Click **Get Started** or **Sign In**. Use the Retail Manager credentials: `retail@freshlens.com` (password: `Password123!`).
* **Talking Points**:
  - *"FreshLens implements strict Role-Based Access Control (RBAC). Depending on the user's role—Consumer, Retail Manager, Warehouse Operator—different pages and actions are exposed."*
  - *"We are logging into the Retail Portal, which displays the overall freshness levels and FEFO recommendations."*

### 1:00–2:00 | Add Inventory Item & Batch
* **Action**: 
  1. Navigate to the **Inventory / Batches** tab.
  2. Click **Create New Batch** (e.g., `BATCH-APP-09`, Supplier: `Valley Orchards`).
  3. Click **Add Inventory Item** (e.g., Name: `Red Gala Apples`, Category: `Fruits`, Quantity: `50`, Unit: `kg`, Expiry: 7 days in the future, Location: `Cold Storage A`, Packaging: `Cartboard Box`).
* **Talking Points**:
  - *"A warehouse operator registers supply shipments under unique batches. The system tracks item categories and packaging types, as different foods degrade differently under temperature and humidity levels."*

### 2:00–3:00 | Food Scanner & AI Analysis
* **Action**:
  1. Navigate to the **Consumer Portal** or **Image Scan** screen.
  2. Upload a sample apple or banana photo (or click one).
  3. Click **Run Scan**.
* **Talking Points**:
  - *"Consumers or quality inspectors scan items visually. The image goes to our FastAPI backend where it undergoes RGB/HSV color segmentations and gray Laplace roughness variance extraction, which are then passed to the computer vision pipeline."*
  - *"The system runs in Demo Mode by default for zero-dependency testing, mapping these features deterministically to predictions. In production mode, it passes them to a 5-layer PyTorch Convolutional Neural Network."*

### 3:00–4:00 | Freshness Score, Shelf Life, & Recommendations
* **Action**: View the analysis results.
* **Talking Points**:
  - *"The scan returns the AI predicted class, confidence level, and calculates a multi-dimensional Freshness Score. This score aggregates: visual condition (40%), storage conditions (25%), estimated shelf life (20%), and age (15%)."*
  - *"The shelf-life is calculated using an Arrhenius kinetic model mapping temperature and humidity."*
  - *"If mold is identified, a safety override forces the freshness score directly to 0.0 and labels the item UNSAFE."*

### 4:00–4:30 | Inventory Analytics & FEFO Dispatch
* **Action**: Navigate to the **Analytics Dashboard**.
* **Talking Points**:
  - *"Warehouse managers inspect overall charts displaying total active items, waste estimations, and storage climate compliance statistics."*
  - *"The system implements FEFO (First Expired, First Out) rules. It dynamically calculates remaining shelf-life across all batches and sorts them to prioritize dispatching the earliest decaying items first."*

### 4:30–5:00 | Reports & Architecture Summary
* **Action**: Navigate to **Reports**, generate a PDF/Excel report, and review the architecture.
* **Talking Points**:
  - *"We can export audits as PDF summaries or Excel sheets."*
  - *"The system architecture uses PostgreSQL for transactions (relational users/items), MongoDB for document logs (alerts/analyses/climates), FastAPI for backend routing, and Next.js for a fluid web interface. Thank you!"*
