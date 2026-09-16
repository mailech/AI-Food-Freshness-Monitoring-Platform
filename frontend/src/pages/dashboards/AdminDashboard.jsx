/** Admin dashboard: users, platform volumes, system health and ML provenance. */
import { Link } from 'react-router-dom';
import {
  Package,
  RefreshCw,
  ScanLine,
  ScrollText,
  Users,
  Zap,
} from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import clsx from 'clsx';
import { adminApi, alertApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks';
import { useMeta } from '../../context/MetaContext';
import { PageHeader, StatGrid } from '../../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  InlineNotice,
  Stat,
} from '../../components/ui';
import { AlertList } from '../../components/domain';
import {
  AlertTrendChart,
  CategoryQualityChart,
  ComplianceChart,
  FreshnessTrendChart,
} from '../../charts';
import { ROLE_LABELS } from '../../context/AuthContext';
import { formatNumber, formatRelative, titleise } from '../../utils/format';

function HealthPill({ ok, label, detail }) {
  return (
    <div
      className={clsx(
        'flex items-start gap-2.5 rounded-xl border p-3',
        ok ? 'border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.07)] dark:bg-[rgb(var(--accent)/0.07)]0/8' : 'border-rose-300/60 dark:border-rose-400/22 bg-rose-50 dark:bg-rose-500/8',
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

export default function AdminDashboard({ data, refetch, greeting }) {
  const toast = useToast();
  const { health } = useMeta();
  const platform = data.platform || {};
  const users = platform.users || {};
  const catalogue = platform.catalogue || {};
  const analysis = platform.analysis || {};
  const ml = platform.ml || {};

  const { data: errors } = useAsync(() => adminApi.errors(8), []);

  async function updateAlert(id, payload) {
    await alertApi.update(id, payload);
    toast.success('Alert updated.');
    refetch();
  }

  async function reloadModels() {
    try {
      const result = await adminApi.reloadModels();
      toast.success(result.message);
      refetch();
    } catch (err) {
      toast.apiError(err);
    }
  }

  return (
    <>
      <DashboardHero
        name={greeting.replace('Welcome back, ', '')}
        roleLabel="Administrator"
        score={data.inventory_health?.average_freshness_score}
        scoreLabel="Platform freshness"
        headline="Platform-wide users, data volumes, system health and AI model provenance."
        subheadline="Every inference role reports honestly whether it is a trained model or a baseline."
        stats={[
          { label: 'Users', value: formatNumber(users.total) },
          { label: 'Analyses', value: formatNumber(analysis.assessments) },
          {
            label: 'Mean latency',
            value: analysis.average_processing_ms ? Math.round(analysis.average_processing_ms) : '—',
            suffix: 'ms',
          },
        ]}
        className="mb-5"
      />

      <PageHeader
        title="Platform overview"
        description="Volumes, health and model provenance."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={reloadModels}>
              Reload models
            </Button>
            <Link to="/admin/users">
              <Button size="sm" icon={<Users />}>
                Manage users
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        <StatGrid columns={5}>
          <Stat
            label="Total users"
            value={formatNumber(users.total)}
            sublabel={`${formatNumber(users.active)} active · ${formatNumber(users.new_last_7_days)} new this week`}
            icon={<Users />}
          />
          <Stat
            label="Food items"
            value={formatNumber(catalogue.products)}
            sublabel={`${formatNumber(catalogue.batches)} batches · ${formatNumber(catalogue.categories)} categories`}
            icon={<Package />}
          />
          <Stat
            label="Total analyses"
            value={formatNumber(analysis.assessments)}
            sublabel={`${formatNumber(analysis.assessments_last_7_days)} in the last 7 days`}
            tone="info"
            icon={<ScanLine />}
          />
          <Stat
            label="Prediction latency"
            value={analysis.average_processing_ms ? `${Math.round(analysis.average_processing_ms)} ms` : '—'}
            sublabel="Mean image-analysis time"
            icon={<Zap />}
          />
          <Stat
            label="Reports generated"
            value={formatNumber(platform.reports_generated)}
            sublabel={`${formatNumber(platform.storage_readings)} storage readings`}
            icon={<ScrollText />}
          />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* -------------------------------------------------- system health */}
          <Card>
            <CardHeader
              title="System health"
              subtitle="API, database and model status"
              actions={
                <Link to="/admin/system">
                  <Button variant="ghost" size="sm">
                    Details →
                  </Button>
                </Link>
              }
            />
            <CardBody className="space-y-2.5">
              <HealthPill
                ok={health?.status === 'healthy'}
                label={`API ${health?.status || 'unknown'}`}
                detail={`v${health?.version} · ${health?.environment} · uptime ${
                  health?.uptime_seconds ? `${Math.round(health.uptime_seconds)}s` : '—'
                }`}
              />
              <HealthPill
                ok={health?.database === 'connected'}
                label={`Database ${health?.database || 'unknown'}`}
                detail={
                  platform.ml?.model_path
                    ? undefined
                    : 'PostgreSQL in Docker; SQLite locally by default.'
                }
              />
              <HealthPill ok label={`ML mode: ${ml.mode || health?.model || 'demo'}`} detail={ml.disclaimer ? 'See model provenance below.' : undefined} />
            </CardBody>
          </Card>

          {/* ----------------------------------------------- users by role */}
          <Card>
            <CardHeader title="Users by role" subtitle="Distribution across the five roles" />
            <CardBody>
              {Object.keys(users.by_role || {}).length ? (
                <ul className="space-y-2.5">
                  {Object.entries(users.by_role).map(([role, count]) => {
                    const share = users.total ? (count / users.total) * 100 : 0;
                    return (
                      <li key={role}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm text-content-secondary">{ROLE_LABELS[role] || titleise(role)}</span>
                          <span className="text-sm font-semibold tabular-nums text-content-primary">{count}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                          <div className="h-full rounded-full bg-[rgb(var(--accent))]" style={{ width: `${share}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={<Users />} title="No users yet" />
              )}
            </CardBody>
          </Card>

          {/* ------------------------------------------------ recent errors */}
          <Card>
            <CardHeader
              title="Recent failures"
              subtitle="Failed operations from the audit trail"
              actions={
                <Link to="/admin/audit">
                  <Button variant="ghost" size="sm">
                    Audit log →
                  </Button>
                </Link>
              }
            />
            {errors?.length ? (
              <ul className="divide-y divide-edge-subtle">
                {errors.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-medium text-content-primary">{titleise(entry.action)}</p>
                      {entry.status_code && (
                        <Badge className="bg-rose-100/70 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-300/70 dark:ring-rose-400/25">{entry.status_code}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 break-words text-xs text-content-secondary">{entry.description}</p>
                    <p className="mt-1 text-xs text-content-tertiary">
                      {entry.actor_email || 'anonymous'} · {formatRelative(entry.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="✅" title="No recorded failures" description="Nothing has failed recently." />
            )}
          </Card>
        </div>

        {/* --------------------------------------------- ML provenance */}
        <Card>
          <CardHeader
            title="AI model provenance"
            subtitle="Which inference components are trained artefacts and which are transparent baselines"
            actions={ml.mode === 'demo' || ml.mode === 'baseline' ? <DemoBadge /> : null}
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(ml.roles || {}).map(([role, info]) => (
                <div
                  key={role}
                  className={clsx(
                    'rounded-xl border p-3.5',
                    info.is_demo ? 'border-amber-300/60 dark:border-amber-400/22 bg-amber-50 dark:bg-amber-500/8/60' : 'border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.07)] dark:bg-[rgb(var(--accent)/0.07)]0/8/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-content-primary">{titleise(role)}</p>
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
                  <p className="mt-1.5 font-mono text-xs text-content-secondary">
                    {info.name} · {info.version}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-content-secondary">{info.description}</p>
                  {Object.keys(info.metrics || {}).length > 0 ? (
                    <dl className="mt-2 space-y-0.5 text-xs">
                      {Object.entries(info.metrics).map(([metric, value]) => (
                        <div key={metric} className="flex justify-between gap-2">
                          <dt className="text-content-tertiary">{metric.toUpperCase()}</dt>
                          <dd className="font-mono tabular-nums text-content-primary">{Number(value).toFixed(4)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs italic text-content-tertiary">
                      No metrics — training and evaluation required.
                    </p>
                  )}
                </div>
              ))}
            </div>

            {ml.fallback_notes?.length > 0 && (
              <InlineNotice tone="warning" title="Fallbacks in effect">
                <ul className="list-inside list-disc space-y-0.5">
                  {ml.fallback_notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </InlineNotice>
            )}

            {ml.disclaimer && (
              <InlineNotice tone="neutral" title="Honesty statement">
                {ml.disclaimer}
              </InlineNotice>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Platform freshness trend" subtitle="Average score across all tenants, 30 days" />
            <CardBody>
              <FreshnessTrendChart points={data.freshness_trend?.points || []} height={270} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Storage compliance" subtitle="Batch mix across the platform" />
            <CardBody>
              <ComplianceChart counts={data.storage_compliance?.counts || {}} height={270} />
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Category quality" subtitle="Average freshness and at-risk batches" />
            <CardBody>
              <CategoryQualityChart categories={data.category_quality || []} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Alert volume" subtitle="Last 30 days" />
            <CardBody>
              <AlertTrendChart points={data.alerts?.points || []} height={260} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Open platform alerts"
            actions={
              <Link to="/alerts">
                <Button variant="ghost" size="sm">
                  All alerts →
                </Button>
              </Link>
            }
          />
          <AlertList alerts={data.open_alerts || []} onUpdate={updateAlert} />
        </Card>
      </div>
    </>
  );
}
