/** Application routes. */
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireGuest, RequirePermission } from './components/guards';
import { Spinner } from './components/ui';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/dashboards/DashboardPage';

// Route-level code splitting keeps the initial bundle small.
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const BatchesPage = lazy(() => import('./pages/BatchesPage'));
const BatchDetailPage = lazy(() => import('./pages/BatchDetailPage'));
const BatchFormPage = lazy(() => import('./pages/BatchFormPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const RotationPage = lazy(() => import('./pages/RotationPage'));
const StoragePage = lazy(() => import('./pages/StoragePage'));
const InspectionsPage = lazy(() => import('./pages/InspectionsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminSystemPage = lazy(() => import('./pages/AdminSystemPage'));
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Role home pages. Each role also has a direct URL (e.g. /retail) in addition
// to the /dashboard dispatcher, so roles can be bookmarked and linked to.
const ConsumerDashboard = lazy(() => import('./pages/dashboards/ConsumerDashboard'));
const RetailDashboard = lazy(() => import('./pages/dashboards/RetailDashboard'));
const WarehouseDashboard = lazy(() => import('./pages/dashboards/WarehouseDashboard'));
const InspectorDashboard = lazy(() => import('./pages/dashboards/InspectorDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-[rgb(var(--accent-ink))]" />
        <p className="text-sm text-content-tertiary">Loading…</p>
      </div>
    </div>
  );
}

/** Wraps a lazy page in Suspense and its permission gate. */
function Page({ element, permissions, roles }) {
  const content = <Suspense fallback={<PageLoader />}>{element}</Suspense>;
  if (permissions?.length || roles?.length) {
    return (
      <RequirePermission permissions={permissions} roles={roles}>
        {content}
      </RequirePermission>
    );
  }
  return content;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ------------------------------------------------------------ guest */}
      <Route
        element={
          <RequireGuest>
            <AuthLayout />
          </RequireGuest>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/admin" element={<LoginPage adminAccess />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* -------------------------------------------------- authenticated */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Direct per-role home pages (each also reachable via /dashboard). */}
        <Route
          path="/consumer"
          element={<Page element={<ConsumerDashboard />} roles={['CONSUMER']} />}
        />
        <Route
          path="/retail"
          element={<Page element={<RetailDashboard />} roles={['RETAIL_MANAGER']} />}
        />
        <Route
          path="/warehouse"
          element={<Page element={<WarehouseDashboard />} roles={['WAREHOUSE_OPERATOR']} />}
        />
        <Route
          path="/inspector"
          element={<Page element={<InspectorDashboard />} roles={['QUALITY_INSPECTOR']} />}
        />
        <Route
          path="/admin"
          element={<Page element={<AdminDashboard />} roles={['ADMIN']} />}
        />

        <Route
          path="/analyze"
          element={<Page element={<AnalyzePage />} permissions={['analysis:create']} />}
        />

        <Route
          path="/inventory"
          element={<Page element={<InventoryPage />} permissions={['inventory:read']} />}
        />
        <Route
          path="/batches"
          element={<Page element={<BatchesPage />} permissions={['batch:read']} />}
        />
        <Route
          path="/batches/new"
          element={<Page element={<BatchFormPage />} permissions={['batch:write']} />}
        />
        <Route
          path="/batches/:batchId"
          element={<Page element={<BatchDetailPage />} permissions={['batch:read']} />}
        />
        <Route
          path="/products"
          element={<Page element={<ProductsPage />} permissions={['product:read']} />}
        />
        <Route
          path="/rotation"
          element={<Page element={<RotationPage />} permissions={['inventory:read']} />}
        />

        <Route
          path="/storage"
          element={<Page element={<StoragePage />} permissions={['storage:read']} />}
        />
        <Route
          path="/inspections"
          element={<Page element={<InspectionsPage />} permissions={['inspection:manage']} />}
        />
        <Route path="/alerts" element={<Page element={<AlertsPage />} permissions={['alert:read']} />} />

        <Route
          path="/analytics"
          element={<Page element={<AnalyticsPage />} permissions={['analytics:read']} />}
        />
        <Route
          path="/reports"
          element={<Page element={<ReportsPage />} permissions={['report:generate']} />}
        />

        <Route path="/profile" element={<Page element={<ProfilePage />} />} />
        <Route path="/about" element={<Page element={<AboutPage />} />} />

        <Route
          path="/admin/users"
          element={<Page element={<AdminUsersPage />} permissions={['user:manage']} />}
        />
        <Route
          path="/admin/system"
          element={<Page element={<AdminSystemPage />} permissions={['system:manage']} />}
        />
        <Route
          path="/admin/audit"
          element={<Page element={<AdminAuditPage />} permissions={['audit:read']} />}
        />

        <Route path="*" element={<Page element={<NotFoundPage />} />} />
      </Route>
    </Routes>
  );
}
