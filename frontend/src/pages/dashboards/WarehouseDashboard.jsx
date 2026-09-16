/** Warehouse dashboard: storage compliance, environment trends and violations. */
import { Link } from 'react-router-dom';
import {
  Boxes,
  CheckCircle2,
  Gauge,
  RefreshCw,
  Snowflake,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import { alertApi, storageApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { PageHeader, StatGrid } from '../../components/guards';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ComplianceBadge,
  EmptyState,
  RiskBadge,
  Stat,
} from '../../components/ui';
import { AlertList } from '../../components/domain';
import { AlertTrendChart, ComplianceChart, EnvironmentTrendChart } from '../../charts';
import {
  formatHumidity,
  formatNumber,
  formatRelative,
  formatTemperature,
} from '../../utils/format';

export default function WarehouseDashboard({ data, refetch, greeting }) {
  const toast = useToast();
  const compliance = data.storage_compliance || {};
  const counts = compliance.counts || {};
  const health = data.inventory_health || {};

  async function updateAlert(id, payload) {
    await alertApi.update(id, payload);
    toast.success('Alert updated.');
    refetch();
  }

  async function pollSensors() {
    try {
      const result = await storageApi.ingestSensors();
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
        roleLabel="Warehouse Operator"
        score={compliance.average_storage_score}
        scoreLabel="Storage score"
        headline="Cold-chain compliance, environmental trends and batch health."
        subheadline="Every reading is evaluated against the recommended envelope for its food category."
        stats={[
          { label: 'Compliance rate', value: compliance.compliance_rate ?? '—', suffix: '%' },
          { label: 'Non-compliant', value: formatNumber(counts.NON_COMPLIANT) },
          { label: 'Readings (14d)', value: formatNumber(compliance.readings_last_14_days) },
        ]}
        className="mb-5"
      />

      <PageHeader
        title="Environment overview"
        description="Live compliance across every active batch."
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={pollSensors}>
              Poll sensors
            </Button>
            <Link to="/storage">
              <Button size="sm" icon={<Snowflake />}>
                Storage monitoring
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        <StatGrid columns={5}>
          <Stat
            label="Compliance rate"
            value={compliance.compliance_rate !== null && compliance.compliance_rate !== undefined ? `${compliance.compliance_rate}%` : '—'}
            sublabel={`${compliance.total_batches ?? 0} batches evaluated`}
            tone={compliance.compliance_rate >= 90 ? 'positive' : compliance.compliance_rate >= 70 ? 'warning' : 'danger'}
            icon={<CheckCircle2 />}
          />
          <Stat
            label="Non-compliant"
            value={formatNumber(counts.NON_COMPLIANT)}
            sublabel={`${formatNumber(counts.WARNING)} in warning`}
            tone={counts.NON_COMPLIANT > 0 ? 'danger' : 'positive'}
            icon={<XCircle />}
          />
          <Stat
            label="Avg storage score"
            value={compliance.average_storage_score ? `${Math.round(compliance.average_storage_score)}/100` : '—'}
            sublabel="Across all batches"
            tone={compliance.average_storage_score >= 80 ? 'positive' : 'warning'}
            icon={<Gauge />}
          />
          <Stat
            label="Readings (14 d)"
            value={formatNumber(compliance.readings_last_14_days)}
            sublabel={`${formatNumber(compliance.violations_last_14_days)} violations`}
            icon={<TrendingUp />}
            tone="info"
          />
          <Stat
            label="Inventory health"
            value={health.health_index !== null && health.health_index !== undefined ? `${health.health_index}%` : '—'}
            sublabel={`${health.total_batches ?? 0} active batches`}
            tone={health.health_index >= 75 ? 'positive' : 'warning'}
            icon={<Boxes />}
          />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Environmental trends"
              subtitle="Daily average and maximum temperature with humidity, last 14 days"
            />
            <CardBody>
              <EnvironmentTrendChart points={data.environment_trends?.points || []} height={290} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Compliance status" subtitle="Batch mix by compliance state" />
            <CardBody>
              <ComplianceChart counts={counts} height={290} />
            </CardBody>
          </Card>
        </div>

        {/* --------------------------------------------------- locations */}
        <Card>
          <CardHeader
            title="Storage locations"
            subtitle="Current averages from recorded readings"
            actions={
              <Link to="/storage">
                <Button variant="ghost" size="sm">
                  Details →
                </Button>
              </Link>
            }
          />
          {data.locations?.length ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.locations.map((location) => (
                <div key={location.location_name} className="rounded-xl border border-edge-subtle p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-content-primary">
                      {location.location_name}
                    </p>
                    <span aria-hidden="true" className="text-base">
                      ❄
                    </span>
                  </div>
                  <div className="mt-3 flex items-end gap-4">
                    <div>
                      <p className="text-xs text-content-tertiary">Avg temp</p>
                      <p className="text-lg font-semibold tabular-nums text-chill-700 dark:text-chill-300 dark:text-chill-200">
                        {formatTemperature(location.avg_temperature_c)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-content-tertiary">Avg humidity</p>
                      <p className="text-lg font-semibold tabular-nums text-content-primary">
                        {formatHumidity(location.avg_humidity_pct)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-content-tertiary">
                    {formatNumber(location.reading_count)} readings · last{' '}
                    {formatRelative(location.last_reading_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Snowflake />}
              title="No storage readings yet"
              description="Record a reading manually or poll the mock sensor provider to populate this view."
              action={
                <Button size="sm" onClick={pollSensors}>
                  Poll sensors
                </Button>
              }
            />
          )}
        </Card>

        {/* ----------------------------------------------- attention needed */}
        <Card>
          <CardHeader
            title="Batches requiring attention"
            subtitle="Outside their recommended storage envelope, worst first"
          />
          {compliance.attention_required?.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Location</th>
                    <th>Temperature</th>
                    <th>Required</th>
                    <th>Humidity</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.attention_required.map((item) => (
                    <tr key={item.batch_id}>
                      <td>
                        <Link
                          to={`/batches/${item.batch_id}`}
                          className="font-mono text-xs font-medium text-[rgb(var(--accent-ink))] hover:underline"
                        >
                          {item.batch_number}
                        </Link>
                      </td>
                      <td className="font-medium">{item.product_name || '—'}</td>
                      <td className="text-content-secondary">{item.location_name || '—'}</td>
                      <td className="tabular-nums font-medium">
                        {formatTemperature(item.current?.temperature_c)}
                      </td>
                      <td className="text-xs tabular-nums text-content-tertiary">
                        {item.required?.temp_min_c}–{item.required?.temp_max_c} °C
                      </td>
                      <td className="tabular-nums">{formatHumidity(item.current?.humidity_pct)}</td>
                      <td>
                        <ComplianceBadge status={item.compliance_status} />
                      </td>
                      <td>
                        <RiskBadge risk={item.risk_level} />
                      </td>
                      <td className="tabular-nums font-medium">
                        {item.storage_score === null || item.storage_score === undefined
                          ? '—'
                          : Math.round(item.storage_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="✅"
              title="All batches are within their recommended ranges"
              description="Storage conditions are compliant across every active batch."
            />
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Storage violations & alerts"
              subtitle="Open alerts, highest severity first"
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

          <Card>
            <CardHeader title="Alert volume" subtitle="Last 14 days" />
            <CardBody>
              <AlertTrendChart points={data.alerts?.points || []} height={210} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
