/** Analytics: every required analytic in one place, with a time-window control. */
import { useState } from 'react';
import { analyticsApi } from '../services';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/MetaContext';
import { useAsync, useDocumentTitle } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
import {
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  InlineNotice,
  Select,
  SkeletonCard,
  Stat,
  Tabs,
} from '../components/ui';
import {
  AlertTrendChart,
  CategoryQualityChart,
  ComplianceChart,
  EnvironmentTrendChart,
  FreshnessDistributionChart,
  FreshnessTrendChart,
  IndicatorFrequencyChart,
  SeverityBreakdownChart,
  ShelfLifeDistributionChart,
  WasteRiskChart,
} from '../charts';
import { formatNumber, formatPercent, titleise } from '../utils/format';

export default function AnalyticsPage() {
  useDocumentTitle('Analytics');
  const { hasPermission } = useAuth();
  const { thresholds } = useMeta();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('quality');

  const { data, loading, error, refetch } = useAsync(() => analyticsApi.full(days), [days]);

  if (loading && !data) {
    return (
      <>
        <PageHeader title="Analytics" description="Loading aggregated metrics…" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={6} />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Analytics" />
        <ErrorState error={error} onRetry={refetch} />
      </>
    );
  }

  const health = data.inventory_health || {};
  const spoilage = data.spoilage || {};
  const waste = data.waste_risk || {};
  const compliance = data.storage_compliance || {};

  const tabs = [
    { value: 'quality', label: 'Quality & freshness' },
    { value: 'shelf', label: 'Shelf life & waste' },
    { value: 'storage', label: 'Storage & environment' },
    { value: 'alerts', label: 'Alerts & indicators' },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Freshness distribution, trends, spoilage rates, shelf-life spread, storage compliance and alert activity."
        actions={
          <Field label="Window" htmlFor="days" className="min-w-[10rem]">
            <Select id="days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              {[7, 14, 30, 60, 90, 180, 365].map((value) => (
                <option key={value} value={value}>
                  Last {value} days
                </option>
              ))}
            </Select>
          </Field>
        }
      />

      <div className="space-y-4">
        <StatGrid columns={5}>
          <Stat
            label="Batches tracked"
            value={formatNumber(health.total_batches)}
            sublabel={`${formatNumber(health.total_quantity, 0)} units`}
            icon="▦"
          />
          <Stat
            label="Avg freshness"
            value={health.average_freshness_score ? `${Math.round(health.average_freshness_score)}/100` : '—'}
            sublabel={`Health index ${health.health_index ?? '—'}%`}
            tone={health.average_freshness_score >= 75 ? 'positive' : 'warning'}
            icon="🍃"
          />
          <Stat
            label="Spoilage rate"
            value={`${spoilage.spoilage_rate_pct ?? 0}%`}
            sublabel={`${formatNumber(spoilage.spoiled_count + spoilage.expired_count)} batches`}
            tone={spoilage.spoilage_rate_pct > 10 ? 'danger' : spoilage.spoilage_rate_pct > 5 ? 'warning' : 'positive'}
            icon="✕"
          />
          <Stat
            label="Avg remaining life"
            value={
              data.shelf_life_distribution?.average_remaining_days
                ? `${data.shelf_life_distribution.average_remaining_days.toFixed(1)} d`
                : '—'
            }
            sublabel={`${formatNumber(spoilage.near_spoilage_count)} near spoilage`}
            icon="⏳"
          />
          <Stat
            label="Storage compliance"
            value={compliance.compliance_rate !== null && compliance.compliance_rate !== undefined ? `${compliance.compliance_rate}%` : '—'}
            sublabel={`${formatNumber(compliance.violations_last_14_days)} violations (14 d)`}
            tone={compliance.compliance_rate >= 90 ? 'positive' : 'warning'}
            icon="❄"
          />
        </StatGrid>

        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        {/* --------------------------------------------- quality & freshness */}
        {tab === 'quality' && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Average freshness over time"
                  subtitle={`Daily mean across all assessments, last ${days} days`}
                />
                <CardBody>
                  <FreshnessTrendChart
                    points={data.average_freshness_over_time?.points || []}
                    thresholds={thresholds}
                    height={300}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader
                  title="Freshness distribution"
                  subtitle={`${data.freshness_distribution?.total_assessed ?? 0} assessed · ${
                    data.freshness_distribution?.unassessed ?? 0
                  } not yet assessed`}
                />
                <CardBody>
                  <FreshnessDistributionChart
                    items={data.freshness_distribution?.items || []}
                    variant="pie"
                    height={300}
                  />
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Category-level quality"
                subtitle="Average freshness score and at-risk batch count per food category"
              />
              <CardBody>
                <CategoryQualityChart categories={data.category_quality || []} height={300} />
              </CardBody>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader title="Category detail" />
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Batches</th>
                      <th>Avg freshness</th>
                      <th>At risk</th>
                      <th>At risk %</th>
                      <th>Total quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.category_quality || []).map((row) => (
                      <tr key={row.category_slug}>
                        <td className="font-medium">{row.category_name}</td>
                        <td className="tabular-nums">{formatNumber(row.batch_count)}</td>
                        <td className="tabular-nums">
                          {row.average_freshness_score ? Math.round(row.average_freshness_score) : '—'}
                        </td>
                        <td className="tabular-nums">{formatNumber(row.at_risk_count)}</td>
                        <td className="tabular-nums">{row.at_risk_pct}%</td>
                        <td className="tabular-nums">{formatNumber(row.total_quantity, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* --------------------------------------------- shelf life & waste */}
        {tab === 'shelf' && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Remaining shelf-life distribution"
                  subtitle="How much life the current stock has left"
                />
                <CardBody>
                  <ShelfLifeDistributionChart buckets={data.shelf_life_distribution?.buckets || []} height={280} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Top batches at risk" subtitle="By quantity and estimated value" />
                <CardBody>
                  <WasteRiskChart topAtRisk={waste.top_at_risk || []} height={280} />
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader title="Waste risk summary" subtitle={waste.note} />
              <CardBody>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-500/8 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">Quantity at risk</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                      {formatNumber(waste.at_risk_quantity, 1)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface-sunken p-4">
                    <p className="text-xs uppercase tracking-wide text-content-secondary">Total tracked</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-content-primary">
                      {formatNumber(waste.total_quantity, 1)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-500/8 p-4">
                    <p className="text-xs uppercase tracking-wide text-rose-600 dark:text-rose-400">Value at risk</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-800 dark:text-rose-200">
                      {formatNumber(waste.at_risk_value, 2)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[rgb(var(--accent)/0.07)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[rgb(var(--accent-ink))] dark:text-leaf-400">Share at risk</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[rgb(var(--accent-ink))] dark:text-leaf-200">
                      {waste.at_risk_share_pct ?? 0}%
                    </p>
                  </div>
                </div>

                {waste.top_at_risk?.length > 0 && (
                  <div className="table-wrap mt-4">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Batch</th>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Est. value</th>
                          <th>Days left</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waste.top_at_risk.map((item) => (
                          <tr key={item.batch_id}>
                            <td className="font-mono text-xs">{item.batch_number}</td>
                            <td className="font-medium">{item.product_name}</td>
                            <td className="tabular-nums">
                              {formatNumber(item.quantity, 1)} {item.unit}
                            </td>
                            <td className="tabular-nums">
                              {item.estimated_value !== null ? formatNumber(item.estimated_value, 2) : '—'}
                            </td>
                            <td className="tabular-nums">
                              {item.remaining_shelf_life_days !== null
                                ? Number(item.remaining_shelf_life_days).toFixed(1)
                                : '—'}
                            </td>
                            <td>{titleise(item.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {/* ------------------------------------------ storage & environment */}
        {tab === 'storage' &&
          (hasPermission('storage:read') ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader
                    title="Temperature and humidity trends"
                    subtitle={`${formatNumber(compliance.readings_last_14_days)} readings in the last 14 days`}
                  />
                  <CardBody>
                    <EnvironmentTrendChart points={data.environment_trends?.points || []} height={300} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader
                    title="Compliance mix"
                    subtitle={`Average storage score ${compliance.average_storage_score ?? '—'}`}
                  />
                  <CardBody>
                    <ComplianceChart counts={compliance.counts || {}} height={300} />
                  </CardBody>
                </Card>
              </div>

              <InlineNotice tone="neutral" title="About the compliance ranges">
                Recommended temperature and humidity bands are configurable engineering defaults per
                food category, not medically or legally authoritative limits. Review them against
                your own food-safety policy before relying on them.
              </InlineNotice>
            </div>
          ) : (
            <Card>
              <CardBody>
                <InlineNotice tone="warning" title="Not available for your role">
                  Storage analytics require the storage:read permission.
                </InlineNotice>
              </CardBody>
            </Card>
          ))}

        {/* ------------------------------------------ alerts & indicators */}
        {tab === 'alerts' && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader title="Alert volume" subtitle={`Last ${days} days`} />
                <CardBody>
                  <AlertTrendChart points={data.alert_trends?.points || []} height={260} />
                </CardBody>
              </Card>
              <Card>
                <CardHeader
                  title="By severity"
                  subtitle={`${formatNumber(data.alert_trends?.open_count)} open · ${formatNumber(
                    data.alert_trends?.critical_open_count,
                  )} high/critical`}
                />
                <CardBody>
                  <SeverityBreakdownChart bySeverity={data.alert_trends?.by_severity || {}} height={260} />
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Spoilage indicator frequency"
                subtitle="Detections by the image-analysis pipeline"
              />
              <CardBody>
                <IndicatorFrequencyChart indicators={data.indicator_summary || []} height={280} />
                <p className="mt-3 text-xs leading-relaxed text-content-tertiary">
                  Detection counts and confidence values are produced by the configured detector. In
                  demo/baseline mode these come from the OpenCV rules and are not validated accuracy
                  figures.
                </p>
              </CardBody>
            </Card>

            {data.alert_trends?.by_type?.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader title="Alerts by type" subtitle={`Last ${days} days`} />
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Alert type</th>
                        <th>Count</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.alert_trends.by_type.map((row) => {
                        const total = data.alert_trends.by_type.reduce((sum, r) => sum + r.count, 0);
                        return (
                          <tr key={row.alert_type}>
                            <td className="font-medium">{titleise(row.alert_type)}</td>
                            <td className="tabular-nums">{formatNumber(row.count)}</td>
                            <td className="tabular-nums">
                              {formatPercent(total ? (row.count / total) * 100 : 0, { digits: 1 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
