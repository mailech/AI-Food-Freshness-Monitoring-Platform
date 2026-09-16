import RetailManagerLayout from "./layouts/RetailManagerLayout";
import ConsumerLayout from "./layouts/ConsumerLayout";
import AdminLayout from "./layouts/AdminLayout";

import WasteInsights from "./pages/WasteInsights";
import FoodAnalysis from "./pages/FoodAnalysis";
import BatchManagement from "./pages/BatchManagement";
import Recommendations from "./pages/Recommendations";
import WarehouseDashboard from "./pages/WarehouseDashboard";
import FoodQualityInspectorDashboard from "./pages/FoodQualityInspectorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RetailDashboard from "./pages/RetailDashboard";
import ConsumerDashboard from "./pages/ConsumerDashboard";
import Analytics from "./pages/Analytics";

import WasteReductionReport from "./pages/WasteReductionReport";
import StorageComplianceReport from "./pages/StorageComplianceReport";
import InventoryQualityReport from "./pages/InventoryQualityReport";
import ShelfLifeReport from "./pages/ShelfLifeReport";
import FreshnessReport from "./pages/FreshnessReport";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import StorageMonitoring from "./pages/StorageMonitoring";

import OAuthSuccess from "./OAuthSuccess";

import { Routes, Route, Outlet } from "react-router-dom";

import Home from "./home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Inventory from "./pages/Inventory";
import ConsumerInventory from "./pages/ConsumerInventory";


// =========================================================
// ROLE DASHBOARD
// =========================================================

function RoleDashboard() {
  const role = localStorage.getItem("role");

  if (role === "Retail Manager") {
    return <RetailDashboard />;
  }

  if (role === "Warehouse Operator") {
    return <WarehouseDashboard />;
  }

  if (role === "Food Quality Inspector") {
    return <FoodQualityInspectorDashboard />;
  }

  if (role === "Administrator") {
    return <AdminDashboard />;
  }

  return <ConsumerDashboard />;
}


// =========================================================
// DASHBOARD LAYOUT
// =========================================================

function DashboardLayout() {
  const role = localStorage.getItem("role");

  if (role === "Retail Manager") {
    return <RetailManagerLayout />;
  }

  if (role === "Consumer") {
    return <ConsumerLayout />;
  }

  if (role === "Administrator") {
    return <AdminLayout />;
  }

  return <Outlet />;
}


// =========================================================
// APP
// =========================================================

function App() {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC PAGES
      ===================================================== */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/oauth-success"
        element={<OAuthSuccess />}
      />


      {/* =====================================================
          ROLE DASHBOARD
      ===================================================== */}

      <Route element={<DashboardLayout />}>

        <Route
          path="/dashboard"
          element={<RoleDashboard />}
        />

      </Route>


      {/* =====================================================
          CONSUMER PAGES
      ===================================================== */}

      <Route element={<ConsumerLayout />}>

        {/* FOOD ANALYSIS */}

        <Route
          path="/food-analysis"
          element={<FoodAnalysis />}
        />

        {/* SHELF LIFE */}

        <Route
          path="/shelf-life"
          element={<ShelfLifeReport />}
        />

        {/* STORAGE MONITORING */}

        <Route
          path="/storage-monitoring"
          element={<StorageMonitoring />}
        />

        {/* ALERTS */}

        <Route
          path="/alerts"
          element={<Alerts />}
        />

        {/* REPORTS */}

        <Route
          path="/reports"
          element={<Reports />}
        />

        {/* FRESHNESS REPORT */}

        <Route
          path="/reports/freshness"
          element={<FreshnessReport />}
        />

        {/* SHELF LIFE REPORT */}

        <Route
          path="/reports/shelf-life"
          element={<ShelfLifeReport />}
        />

        {/* INVENTORY QUALITY REPORT */}

        <Route
          path="/reports/inventory"
          element={<InventoryQualityReport />}
        />

        {/* STORAGE COMPLIANCE REPORT */}

        <Route
          path="/reports/storage"
          element={<StorageComplianceReport />}
        />

        {/* WASTE REDUCTION REPORT */}

        <Route
          path="/reports/waste"
          element={<WasteReductionReport />}
        />

        {/* CONSUMER INVENTORY */}

        <Route
          path="/consumer-inventory"
          element={<ConsumerInventory />}
        />

      </Route>


      {/* =====================================================
          RETAIL MANAGER PAGES
      ===================================================== */}

      <Route element={<RetailManagerLayout />}>

        {/* INVENTORY */}

        <Route
          path="/inventory"
          element={<Inventory />}
        />

        {/* BATCH MANAGEMENT */}

        <Route
          path="/batch-management"
          element={<BatchManagement />}
        />

        {/* RECOMMENDATIONS */}

        <Route
          path="/retail/recommendations"
          element={<Recommendations />}
        />

        {/* FRESHNESS ANALYSIS */}

        <Route
          path="/retail/freshness-analysis"
          element={<FoodAnalysis />}
        />

        {/* SHELF LIFE */}

        <Route
          path="/retail/shelf-life"
          element={<ShelfLifeReport />}
        />

        {/* ALERTS */}

        <Route
          path="/retail/alerts"
          element={<Alerts />}
        />

        {/* STORAGE MONITORING */}

        <Route
          path="/retail/storage-monitoring"
          element={<StorageMonitoring />}
        />

        {/* REPORTS */}

        <Route
          path="/retail/reports"
          element={<Reports />}
        />

        {/* ANALYTICS */}

        <Route
          path="/retail/analytics"
          element={<Analytics />}
        />

        {/* WASTE INSIGHTS */}

        <Route
          path="/retail/waste-insights"
          element={<WasteInsights />}
        />

      </Route>


      {/* =====================================================
          ADMIN PAGES
      ===================================================== */}

      <Route element={<AdminLayout />}>

        {/* ADMIN DASHBOARD */}

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        {/* USER MANAGEMENT */}

        <Route
          path="/admin/users"
          element={<div />}
        />

        {/* FOOD INVENTORY */}

        <Route
          path="/admin/inventory"
          element={<Inventory />}
        />

        {/* FRESHNESS MONITORING */}

        <Route
          path="/admin/freshness"
          element={<FoodAnalysis />}
        />

        {/* SHELF LIFE */}

        <Route
          path="/admin/shelf-life"
          element={<ShelfLifeReport />}
        />

        {/* STORAGE MONITORING */}

        <Route
          path="/admin/storage"
          element={<StorageMonitoring />}
        />

        {/* ALERTS */}

        <Route
          path="/admin/alerts"
          element={<Alerts />}
        />

        {/* REPORTS */}

        <Route
          path="/admin/reports"
          element={<Reports />}
        />

        {/* SYSTEM STATUS */}

        <Route
          path="/admin/system-status"
          element={<div />}
        />

        {/* ADMIN PROFILE */}

        <Route
          path="/admin/profile"
          element={<div />}
        />

      </Route>

    </Routes>
  );
}

export default App;