import WasteReductionReport from "./pages/WasteReductionReport";
import StorageComplianceReport from "./pages/StorageComplianceReport";
import InventoryQualityReport from "./pages/InventoryQualityReport";
import ShelfLifeReport from "./pages/ShelfLifeReport";
import FreshnessReport from "./pages/FreshnessReport";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import StorageMonitoring from "./pages/StorageMonitoring";
import OAuthSuccess from "./OAuthSuccess";
import { Routes, Route } from "react-router-dom";
import Home from "./home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";

function App() {
  return (
    <Routes>

      {/* Home Page */}
      <Route path="/" element={<Home />} />

      {/* Login Page */}
      <Route path="/login" element={<Login />} />

      {/* Register Page */}
      <Route path="/register" element={<Register />} />

      {/* Dashboard Page */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route
  path="/storage-monitoring"
  element={<StorageMonitoring />}
/>
<Route path="/alerts" element={<Alerts />} />
<Route path="/reports" element={<Reports />} />
<Route
  path="/reports/freshness"
  element={<FreshnessReport />}
/>
<Route
  path="/reports/shelf-life"
  element={<ShelfLifeReport />}
/>
<Route
  path="/reports/inventory"
  element={<InventoryQualityReport />}
/>
<Route
  path="/reports/storage"
  element={<StorageComplianceReport />}
/>
<Route
  path="/reports/waste"
  element={<WasteReductionReport />}
/>
<Route path="/oauth-success" element={<OAuthSuccess />} />
    </Routes>
  );
}

export default App;