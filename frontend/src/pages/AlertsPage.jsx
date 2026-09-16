/** Alert centre: filter, triage, resolve and re-scan. */
import { useState } from 'react';
import { alertApi, analyticsApi } from '../services';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDocumentTitle, usePagination } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Pagination,
  Select,
  SkeletonCard,
  Stat,
  Tabs,
} from '../components/ui';
import { AlertList } from '../components/domain';
import { AlertTrendChart, SeverityBreakdownChart } from '../charts';
import { formatNumber, titleise } from '../utils/format';

export default function AlertsPage() {
  useDocumentTitle('Alerts');
  const { hasPermission } = useAuth();
  const { alertTypeOptions, severityOptions } = useMeta();
  const toast = useToast();
  const pagination = usePagination(20);

  const [tab, setTab] = useState('open');
  const [alertType, setAlertType] = useState('');
  const [severity, setSeverity] = useState('');
  const [scanning, setScanning] = useState(false);

  const canWrite = hasPermission('alert:write');
  const resolvedFilter = tab === 'open' ? false : tab === 'resolved' ? true : undefined;
  const readFilter = tab === 'unread' ? false : undefined;

  const { data, loading, error, refetch } = useAsync(
    () =>
      alertApi.list({
        alert_type: alertType || undefined,
        severity: severity || undefined,
        resolved: resolvedFilter,
        is_read: readFilter,
        page: pagination.page,
        page_size: pagination.pageSize,
      }),
    [alertType, severity, tab, pagination.page, pagination.pageSize],
  );

  const { data: summary, refetch: refetchSummary } = useAsync(alertApi.summary, []);
  const { data: trends } = useAsync(() => analyticsApi.alertTrends(30), []);

  const alerts = data?.items || [];
  const meta = data?.meta || {};

  async function updateAlert(id, payload) {
    await alertApi.update(id, payload);
    refetch();
    refetchSummary();
  }

  async function markAllRead() {
    try {
      const result = await alertApi.markAllRead();
      toast.success(result.message);
      refetch();
      refetchSummary();
    } catch (err) {
      toast.apiError(err);
    }
  }

  async function rescan() {
    setScanning(true);
    try {
      const result = await alertApi.scan();
      const raised = result.raised || {};
      toast.success(
        `${result.message} Raised: ${Object.entries(raised)
          .map(([key, value]) => `${value} ${key}`)
          .join(', ')}.`,
      );
      refetch();
      refetchSummary();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setScanning(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Freshness, shelf-life, expiry, storage and inventory-risk alerts with severity and lifecycle."
        actions={
          canWrite && (
            <>
              <Button variant="secondary" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
              <Button size="sm" icon="⟳" loading={scanning} onClick={rescan}>
                Re-scan batches
              </Button>
            </>
          )
        }
      />

      <div className="space-y-4">
        <StatGrid>
          <Stat label="Total alerts" value={formatNumber(summary?.total)} icon="⚑" />
          <Stat
            label="Open"
            value={formatNumber(summary?.open)}
            sublabel="Unresolved"
            tone={summary?.open > 0 ? 'warning' : 'positive'}
            icon="!"
          />
          <Stat
            label="Unread"
            value={formatNumber(summary?.unread)}
            tone={summary?.unread > 0 ? 'info' : 'neutral'}
            icon="🔔"
          />
          <Stat
            label="Critical + high"
            value={formatNumber(
              (summary?.by_severity?.CRITICAL ?? 0) + (summary?.by_severity?.HIGH ?? 0),
            )}
            sublabel="Highest priority"
            tone={
              (summary?.by_severity?.CRITICAL ?? 0) + (summary?.by_severity?.HIGH ?? 0) > 0
                ? 'danger'
                : 'positive'
            }
            icon="✕"
          />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Alert volume" subtitle="Last 30 days" />
            <CardBody>
              <AlertTrendChart points={trends?.points || []} height={220} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="By severity" />
            <CardBody>
              <SeverityBreakdownChart bySeverity={summary?.by_severity || {}} height={220} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Alert type" htmlFor="type">
                <Select
                  id="type"
                  value={alertType}
                  onChange={(event) => {
                    setAlertType(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All types</option>
                  {alertTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Severity" htmlFor="severity">
                <Select
                  id="severity"
                  value={severity}
                  onChange={(event) => {
                    setSeverity(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All severities</option>
                  {severityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <Tabs
            className="px-4"
            active={tab}
            onChange={(value) => {
              setTab(value);
              pagination.setPage(1);
            }}
            tabs={[
              { value: 'open', label: 'Open', count: summary?.open },
              { value: 'unread', label: 'Unread', count: summary?.unread },
              { value: 'resolved', label: 'Resolved' },
              { value: 'all', label: 'All', count: summary?.total },
            ]}
          />

          {loading && !data ? (
            <CardBody>
              <SkeletonCard lines={6} />
            </CardBody>
          ) : error ? (
            <CardBody>
              <ErrorState error={error} onRetry={refetch} />
            </CardBody>
          ) : alerts.length === 0 ? (
            <EmptyState
              icon="✅"
              title={tab === 'open' ? 'No open alerts' : 'No alerts match these filters'}
              description="Alerts are raised automatically when freshness drops, shelf life runs short or storage drifts out of range."
            />
          ) : (
            <>
              <AlertList alerts={alerts} onUpdate={canWrite ? updateAlert : undefined} />
              <Pagination
                page={pagination.page}
                totalPages={meta.total_pages}
                total={meta.total}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </>
          )}
        </Card>

        {summary?.by_type && (
          <Card>
            <CardHeader title="Alerts by type" subtitle="All time" />
            <CardBody>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(summary.by_type)
                  .filter(([, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <li
                      key={type}
                      className="flex items-center justify-between gap-2 rounded-xl border border-edge-subtle px-3 py-2"
                    >
                      <span className="truncate text-sm text-content-secondary">{titleise(type)}</span>
                      <span className="flex-none text-sm font-semibold tabular-nums text-content-primary">{count}</span>
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
