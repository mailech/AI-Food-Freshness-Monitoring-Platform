import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { RoleDashboard } from './components/dashboards/RoleDashboard';
import { FreshnessScanner } from './components/scanner/FreshnessScanner';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { StorageMonitoring } from './components/storage/StorageMonitoring';
import { AlertsCenter } from './components/alerts/AlertsCenter';
import { Recommendations } from './components/reports/Recommendations';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { InspectorWorkbench } from './components/dashboards/InspectorWorkbench';
import { AdminPanel } from './components/common/AdminPanel';

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<RoleDashboard />} />
            <Route path="/scanner" element={<FreshnessScanner />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/storage" element={<StorageMonitoring />} />
            <Route path="/alerts" element={<AlertsCenter />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/reports" element={<ReportsCenter />} />
            <Route path="/inspections" element={<InspectorWorkbench />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
