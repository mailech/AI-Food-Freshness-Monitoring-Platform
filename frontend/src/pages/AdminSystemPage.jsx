/** Admin: system health, effective settings and ML registry control. */
import { useState } from 'react';
import clsx from 'clsx';
import { adminApi, notificationApi } from '../services';
import { useToast } from '../context/ToastContext';
import { useAsync, useDocumentTitle } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataList,
  EmptyState,
  ErrorState,
  Field,
  InlineNotice,
  Input,
  Modal,
  Select,
  SkeletonCard,
  Stat,
  Tabs,
  Textarea,
} from '../components/ui';
import { formatNumber, formatPercent, titleise } from '../utils/format';

function StatusRow({ ok, label, detail }) {
  return (
    <div
      className={clsx(
        'flex items-start gap-2.5 rounded-xl border p-3',
        ok ? 'border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.07)]' : 'border-rose-300/60 dark:border-rose-400/22 bg-rose-50 dark:bg-rose-500/8',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold',
          ok ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]' : 'bg-rose-600 text-white',
        )}
      >
        {ok ? '✓' : '✕'}
      </span>
      <div className="min-w-0">
        <p className={clsx('text-sm font-medium', ok ? 'text-[rgb(var(--accent-ink))] dark:text-leaf-200' : 'text-rose-800 dark:text-rose-200')}>{label}</p>
        {detail && <p className="mt-0.5 break-words text-xs text-content-secondary">{detail}</p>}
      </div>
    </div>
  );
}

function BroadcastModal({ open, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', message: '', severity: 'INFO' });
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const result = await notificationApi.broadcast(form);
      toast.success(result.message);
      setForm({ title: '', message: '', severity: 'INFO' });
      onClose();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Broadcast a system notification"
      description="Sent to every active user's notification centre."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} loading={sending} disabled={!form.title || !form.message}>
            Send to all users
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="b-title" required>
          <Input id="b-title" value={form.title} onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} />
        </Field>
        <Field label="Message" htmlFor="b-message" required>
          <Textarea
            id="b-message"
            value={form.message}
            onChange={(event) => setForm((c) => ({ ...c, message: event.target.value }))}
          />
        </Field>
        <Field label="Severity" htmlFor="b-severity">
          <Select
            id="b-severity"
            value={form.severity}
            onChange={(event) => setForm((c) => ({ ...c, severity: event.target.value }))}
          >
            {['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => (
              <option key={severity} value={severity}>
                {titleise(severity)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export default function AdminSystemPage() {
  useDocumentTitle('System & health');
  const toast = useToast();
  const [tab, setTab] = useState('health');
  const [reloading, setReloading] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const { data: health, loading, error, refetch } = useAsync(adminApi.health, []);
  const { data: settings } = useAsync(adminApi.settings, []);
  const { data: errors, refetch: refetchErrors } = useAsync(() => adminApi.errors(25), []);

  async function reloadModels() {
    setReloading(true);
    try {
      const result = await adminApi.reloadModels();
      toast.success(result.message);
      refetch();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setReloading(false);
    }
  }

  if (loading && !health) {
    return (
      <>
        <PageHeader title="System & health" description="Loading system status…" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={5} />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="System & health" />
        <ErrorState error={error} onRetry={refetch} />
      </>
    );
  }

  const stats = health?.statistics || {};
  const ml = health?.ml || {};

  return (
    <>
      <PageHeader
        title="System & health"
        description="Database, storage, sensors, ML registry and effective configuration."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBroadcastOpen(true)}>
              Broadcast notice
            </Button>
            <Button size="sm" icon="⟳" loading={reloading} onClick={reloadModels}>
              Reload ML models
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <StatGrid columns={5}>
          <Stat
            label="Status"
            value={titleise(health?.status)}
            sublabel={`Python ${health?.runtime?.python}`}
            tone={health?.status === 'healthy' ? 'positive' : 'danger'}
            icon={health?.status === 'healthy' ? '✓' : '✕'}
          />
          <Stat
            label="Database"
            value={health?.database?.connected ? 'Connected' : 'Down'}
            sublabel={health?.database?.detail}
            tone={health?.database?.connected ? 'positive' : 'danger'}
            icon="🗄"
          />
          <Stat
            label="ML mode"
            value={titleise(ml.mode)}
            sublabel={`${ml.trained_roles?.length ?? 0} trained · ${ml.baseline_roles?.length ?? 0} baseline`}
            tone={ml.any_trained ? 'positive' : 'warning'}
            icon="⌾"
          />
          <Stat
            label="Storage backend"
            value={titleise(health?.storage?.backend)}
            sublabel={`Max upload ${health?.storage?.max_upload_mb} MB`}
            icon="📁"
          />
          <Stat
            label="Recommendation rules"
            value={formatNumber(health?.recommendation_rules)}
            sublabel={`Sensors: ${health?.sensors?.provider}`}
            icon="💡"
          />
        </StatGrid>

        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'health', label: 'Health' },
            { value: 'settings', label: 'Configuration' },
            { value: 'stats', label: 'Statistics' },
            { value: 'errors', label: 'Failures', count: errors?.length },
          ]}
        />

        {tab === 'health' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Component status" />
              <CardBody className="space-y-2.5">
                <StatusRow
                  ok={health?.status === 'healthy'}
                  label="API"
                  detail={`${health?.runtime?.platform} · Python ${health?.runtime?.python}`}
                />
                <StatusRow
                  ok={health?.database?.connected}
                  label="Database"
                  detail={health?.database?.detail}
                />
                <StatusRow
                  ok
                  label={`File storage: ${health?.storage?.backend}`}
                  detail={`Allowed: ${(health?.storage?.allowed_extensions || []).join(', ')}`}
                />
                <StatusRow
                  ok={health?.sensors?.available}
                  label={`Sensor provider: ${health?.sensors?.provider}`}
                  detail={
                    health?.sensors?.requires_hardware
                      ? 'Requires an MQTT broker'
                      : 'Mock provider — no hardware required'
                  }
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="ML registry"
                subtitle={ml.disclaimer ? 'Provenance of each inference role' : undefined}
              />
              <CardBody className="space-y-2.5">
                {Object.entries(ml.roles || {}).map(([role, info]) => (
                  <div
                    key={role}
                    className={clsx(
                      'rounded-xl border p-3',
                      info.is_demo ? 'border-amber-300/60 dark:border-amber-400/22 bg-amber-50 dark:bg-amber-500/8/50' : 'border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.05)]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-content-primary">{titleise(role)}</p>
                      <Badge
                        className={
                          info.is_demo
                            ? 'bg-amber-100/70 dark:bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-300/70 dark:ring-amber-400/25'
                            : 'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]'
                        }
                      >
                        {info.is_demo ? 'Baseline' : 'Trained'}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-content-secondary">
                      {info.name} · {info.version}
                    </p>
                  </div>
                ))}
                {ml.fallback_notes?.length > 0 && (
                  <InlineNotice tone="warning" title="Fallbacks">
                    <ul className="list-inside list-disc space-y-0.5">
                      {ml.fallback_notes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </InlineNotice>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'settings' && settings && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Application" />
              <CardBody>
                <DataList
                  className="sm:grid-cols-1"
                  items={[
                    { label: 'Name', value: settings.app?.name },
                    { label: 'Version', value: settings.app?.version },
                    { label: 'Environment', value: settings.app?.environment },
                    { label: 'Debug', value: String(settings.app?.debug) },
                    { label: 'API prefix', value: <code className="font-mono text-xs">{settings.app?.api_prefix}</code> },
                    { label: 'Database dialect', value: settings.database?.dialect },
                  ]}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Freshness scoring model" subtitle="Weights and thresholds in effect" />
              <CardBody className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(settings.scoring?.weights || {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-surface-sunken p-2.5 text-center">
                      <p className="text-lg font-semibold tabular-nums text-[rgb(var(--accent-ink))]">
                        {formatPercent(value, { fromFraction: true })}
                      </p>
                      <p className="mt-0.5 text-xs text-content-tertiary">{titleise(key)}</p>
                    </div>
                  ))}
                </div>
                <DataList
                  className="sm:grid-cols-2"
                  items={Object.entries(settings.scoring?.thresholds || {}).map(([key, value]) => ({
                    label: `${titleise(key)} threshold`,
                    value: `≥ ${value}`,
                  }))}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Alerting thresholds" />
              <CardBody>
                <DataList
                  className="sm:grid-cols-2"
                  items={Object.entries(settings.alerting || {}).map(([key, value]) => ({
                    label: titleise(key),
                    value: String(value),
                  }))}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Uploads, sensors and integrations" />
              <CardBody className="space-y-4">
                <DataList
                  className="sm:grid-cols-2"
                  items={[
                    { label: 'Storage backend', value: settings.uploads?.storage_backend },
                    { label: 'Max upload', value: `${settings.uploads?.max_upload_mb} MB` },
                    {
                      label: 'Allowed extensions',
                      value: (settings.uploads?.allowed_extensions || []).join(', '),
                    },
                    { label: 'Sensor provider', value: settings.sensors?.provider },
                    { label: 'OAuth enabled', value: String(settings.integrations?.oauth_enabled) },
                    { label: 'Email enabled', value: String(settings.integrations?.email_enabled) },
                    { label: 'Rate limiting', value: String(settings.integrations?.rate_limit_enabled) },
                    { label: 'DEMO_MODE', value: String(settings.ml?.demo_mode) },
                  ]}
                />
                <InlineNotice tone="neutral">
                  <p className="text-xs leading-relaxed">{settings.note}</p>
                </InlineNotice>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'stats' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Users" />
              <CardBody>
                <DataList
                  className="sm:grid-cols-2"
                  items={[
                    { label: 'Total', value: formatNumber(stats.users?.total) },
                    { label: 'Active', value: formatNumber(stats.users?.active) },
                    { label: 'Inactive', value: formatNumber(stats.users?.inactive) },
                    { label: 'New (7 days)', value: formatNumber(stats.users?.new_last_7_days) },
                  ]}
                />
                <div className="mt-4 space-y-2">
                  {Object.entries(stats.users?.by_role || {}).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-content-secondary">{titleise(role)}</span>
                      <span className="font-semibold tabular-nums text-content-primary">{count}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Data volumes" />
              <CardBody>
                <DataList
                  className="sm:grid-cols-2"
                  items={[
                    { label: 'Categories', value: formatNumber(stats.catalogue?.categories) },
                    { label: 'Products', value: formatNumber(stats.catalogue?.products) },
                    { label: 'Batches', value: formatNumber(stats.catalogue?.batches) },
                    { label: 'Inventory items', value: formatNumber(stats.catalogue?.inventory_items) },
                    { label: 'Assessments', value: formatNumber(stats.analysis?.assessments) },
                    {
                      label: 'Shelf-life predictions',
                      value: formatNumber(stats.analysis?.shelf_life_predictions),
                    },
                    { label: 'Storage readings', value: formatNumber(stats.storage_readings) },
                    { label: 'Reports generated', value: formatNumber(stats.reports_generated) },
                  ]}
                />
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Performance" subtitle="Measured from stored analysis records" />
              <CardBody>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-chill-50 dark:bg-chill-500/8 p-4">
                    <p className="text-xs uppercase tracking-wide text-chill-700 dark:text-chill-300">
                      Mean prediction latency
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-chill-700 dark:text-chill-300 dark:text-chill-200 dark:text-chill-100">
                      {stats.analysis?.average_processing_ms
                        ? `${Math.round(stats.analysis.average_processing_ms)} ms`
                        : '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-chill-700 dark:text-chill-300">Image analysis, server-side</p>
                  </div>
                  <div className="rounded-xl bg-surface-sunken p-4">
                    <p className="text-xs uppercase tracking-wide text-content-secondary">Analyses (7 days)</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-content-primary">
                      {formatNumber(stats.analysis?.assessments_last_7_days)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[rgb(var(--accent)/0.07)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[rgb(var(--accent-ink))] dark:text-leaf-400">Total analyses</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[rgb(var(--accent-ink))] dark:text-leaf-200">
                      {formatNumber(stats.analysis?.assessments)}
                    </p>
                  </div>
                </div>
                <InlineNotice tone="neutral" className="mt-4">
                  <p className="text-xs leading-relaxed">
                    Latency is measured, not estimated. Throughput and concurrent-user capacity depend
                    on your deployment topology — benchmark them in your own environment rather than
                    assuming a figure.
                  </p>
                </InlineNotice>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'errors' && (
          <Card className="overflow-hidden">
            <CardHeader
              title="Recent failed operations"
              subtitle="Derived from audit entries with success = false"
              actions={
                <Button variant="ghost" size="sm" onClick={refetchErrors}>
                  Refresh
                </Button>
              }
            />
            {errors?.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Actor</th>
                      <th>Path</th>
                      <th>Status</th>
                      <th>IP</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-medium">{titleise(entry.action)}</td>
                        <td className="max-w-sm text-content-secondary">{entry.description}</td>
                        <td className="text-xs text-content-tertiary">{entry.actor_email || 'anonymous'}</td>
                        <td className="font-mono text-xs text-content-tertiary">{entry.path || '—'}</td>
                        <td>
                          {entry.status_code && (
                            <Badge className="bg-rose-100/70 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-300/70 dark:ring-rose-400/25">
                              {entry.status_code}
                            </Badge>
                          )}
                        </td>
                        <td className="font-mono text-xs text-content-tertiary">{entry.ip_address || '—'}</td>
                        <td className="whitespace-nowrap text-xs text-content-tertiary">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="✅" title="No recorded failures" description="Nothing has failed recently." />
            )}
          </Card>
        )}
      </div>

      <BroadcastModal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
    </>
  );
}
