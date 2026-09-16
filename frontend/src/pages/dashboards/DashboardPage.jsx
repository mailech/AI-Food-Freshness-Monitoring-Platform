/** Loads the role-aware dashboard payload once and renders the matching view. */
import { useAuth } from '../../context/AuthContext';
import { analyticsApi } from '../../services';
import { useAsync, useDocumentTitle } from '../../hooks';
import { ErrorState, SkeletonCard } from '../../components/ui';
import { PageHeader, StatGrid } from '../../components/guards';
import ConsumerDashboard from './ConsumerDashboard';
import RetailDashboard from './RetailDashboard';
import WarehouseDashboard from './WarehouseDashboard';
import InspectorDashboard from './InspectorDashboard';
import AdminDashboard from './AdminDashboard';

const VIEWS = {
  CONSUMER: ConsumerDashboard,
  RETAIL_MANAGER: RetailDashboard,
  WAREHOUSE_OPERATOR: WarehouseDashboard,
  QUALITY_INSPECTOR: InspectorDashboard,
  ADMIN: AdminDashboard,
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <StatGrid>
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} lines={1} />
        ))}
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2" lines={7} />
        <SkeletonCard lines={7} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, role, roleLabel } = useAuth();
  useDocumentTitle('Dashboard');

  const { data, loading, error, refetch } = useAsync(analyticsApi.dashboard, [role]);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Dashboard" description="Loading your latest freshness data…" />
        <DashboardSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState error={error} onRetry={refetch} title="Could not load the dashboard" />
      </>
    );
  }

  const View = VIEWS[role] || ConsumerDashboard;
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <View
      data={data}
      refetch={refetch}
      loading={loading}
      greeting={`Welcome back, ${firstName}`}
      roleLabel={roleLabel}
    />
  );
}
