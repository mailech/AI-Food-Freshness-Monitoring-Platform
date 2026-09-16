/** Retail dashboard: stock quality, trends, waste risk and shelf-life alerts. */
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Leaf,
  ScanLine,
  ScrollText,
  XCircle,
} from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import { alertApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { PageHeader, StatGrid } from '../../components/guards';
import { Button, Card, CardBody, CardHeader, Stat, StatusBadge } from '../../components/ui';
import { AlertList } from '../../components/domain';
import {
  AlertTrendChart,
  CategoryQualityChart,
  FreshnessDistributionChart,
  FreshnessTrendChart,
  ShelfLifeDistributionChart,
  WasteRiskChart,
} from '../../charts';
import {
  daysUntilLabel,
  formatDate,
  formatNumber,
  formatQuantity,
  scoreColor,
} from '../../utils/format';

export default function RetailDashboard({ data, refetch, greeting }) {
  const toast = useToast();
  const health = data.inventory_health || {};
  const statuses = health.status_counts || {};
  const spoilage = data.spoilage || {};
  const waste = data.waste_risk || {};

  async function updateAlert(id, payload) {
    await alertApi.update(id, payload);
    toast.success('Alert updated.');
    refetch();
  }

  return (
    <>
      <DashboardHero
        name={greeting.replace('Welcome back, ', '')}
        roleLabel="Retail Manager"
        score={health.average_freshness_score}
        scoreLabel="Store freshness"
        headline="Store-wide inventory quality, freshness trends and waste-reduction insight."
        subheadline="Prioritise what to sell first and see exactly how much value is at risk."
        stats={[
          { label: 'Total batches', value: formatNumber(health.total_batches) },
          { label: 'Near spoilage', value: formatNumber(statuses.NEAR_SPOILAGE) },
          { label: 'Value at risk', value: formatNumber(waste.at_risk_value, 0) },
        ]}
        className="mb-5"
      />

      <PageHeader
        title="Overview"
        description="Key figures across the store."
        actions={
          <>
            <Link to="/reports">
              <Button variant="secondary" size="sm" icon={<ScrollText />}>
                Generate report
              </Button>
            </Link>
            <Link to="/analyze">
              <Button size="sm" icon={<ScanLine />}>
                Analyse Food
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        <StatGrid columns={5}>
          <Stat
            label="Total inventory"
            value={formatNumber(health.total_batches)}
            sublabel={`${formatNumber(health.total_quantity, 0)} units tracked`}
            icon={<Boxes />}
          />
          <Stat
            label="Fresh & good"
            value={formatNumber((statuses.FRESH ?? 0) + (statuses.GOOD ?? 0))}
            sublabel={`Health index ${health.health_index ?? '—'}%`}
            tone="positive"
            icon={<CheckCircle2 />}
          />
          <Stat
            label="Near spoilage"
            value={formatNumber(statuses.NEAR_SPOILAGE)}
            sublabel="Prioritise for sale"
            tone={statuses.NEAR_SPOILAGE > 0 ? 'warning' : 'neutral'}
            icon={<AlertTriangle />}
          />
          <Stat
            label="Spoiled / expired"
            value={formatNumber((statuses.SPOILED ?? 0) + (statuses.EXPIRED ?? 0))}
            sublabel={`Spoilage rate ${spoilage.spoilage_rate_pct ?? 0}%`}
            tone={(statuses.SPOILED ?? 0) + (statuses.EXPIRED ?? 0) > 0 ? 'danger' : 'positive'}
            icon={<XCircle />}
          />
          <Stat
            label="Avg freshness score"
            value={health.average_freshness_score ? `${Math.round(health.average_freshness_score)}/100` : '—'}
            sublabel={`${health.expiring_soon_count ?? 0} expiring in 3 days`}
            tone={health.average_freshness_score >= 75 ? 'positive' : 'warning'}
            icon={<Leaf />}
          />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Inventory quality trend"
              subtitle="Average freshness score over the last 30 days, with band thresholds shaded"
            />
            <CardBody>
              <FreshnessTrendChart points={data.freshness_trend?.points || []} height={280} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Freshness distribution" subtitle="Batches per freshness band" />
            <CardBody>
              <FreshnessDistributionChart
                items={data.freshness_distribution?.items || []}
                variant="pie"
                height={280}
              />
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Shelf-life distribution"
              subtitle="How much life the current stock has left"
            />
            <CardBody>
              <ShelfLifeDistributionChart buckets={data.shelf_life_distribution?.buckets || []} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Category quality"
              subtitle="Average freshness and at-risk batches per category"
            />
            <CardBody>
              <CategoryQualityChart categories={data.category_quality || []} />
            </CardBody>
          </Card>
        </div>

        {/* ------------------------------------------------- waste insight */}
        <Card>
          <CardHeader
            title="Waste reduction insight"
            subtitle={waste.note}
            actions={
              <Link to="/reports">
                <Button variant="secondary" size="sm">
                  Waste report
                </Button>
              </Link>
            }
          />
          <CardBody>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/8 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    Quantity at risk
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                    {formatNumber(waste.at_risk_quantity, 1)}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {waste.at_risk_share_pct ?? 0}% of {formatNumber(waste.total_quantity, 0)} tracked
                  </p>
                </div>
                <div className="rounded-xl bg-rose-50 dark:bg-rose-500/8 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                    Estimated value at risk
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-800 dark:text-rose-200">
                    {formatNumber(waste.at_risk_value, 2)}
                  </p>
                  <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
                    of {formatNumber(waste.total_value, 2)} total stock value
                  </p>
                </div>
              </div>
              <div className="lg:col-span-2">
                <WasteRiskChart topAtRisk={waste.top_at_risk || []} height={260} />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* -------------------------------------------- shelf-life alerts */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Shelf-life alerts"
              subtitle="Open alerts ordered by severity"
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
            <CardHeader title="Alert volume" subtitle="Last 30 days" />
            <CardBody>
              <AlertTrendChart points={data.alerts?.points || []} height={200} />
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-surface-sunken p-3">
                  <dt className="text-xs text-content-tertiary">Open</dt>
                  <dd className="text-lg font-semibold tabular-nums text-content-primary">
                    {data.alerts?.open_count ?? 0}
                  </dd>
                </div>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-500/8 p-3">
                  <dt className="text-xs text-rose-600 dark:text-rose-400">High / critical</dt>
                  <dd className="text-lg font-semibold tabular-nums text-rose-800 dark:text-rose-200">
                    {data.alerts?.critical_open_count ?? 0}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>

        {/* ---------------------------------------------------- batch health */}
        <Card>
          <CardHeader
            title="Batch health — expiring soonest"
            subtitle="Act on these before they become waste"
            actions={
              <Link to="/batches">
                <Button variant="ghost" size="sm">
                  All batches →
                </Button>
              </Link>
            }
          />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Expiry</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.upcoming_expiries || []).map((item) => (
                  <tr key={item.batch_id}>
                    <td className="font-medium">
                      <Link to={`/batches/${item.batch_id}`} className="text-[rgb(var(--accent-ink))] hover:underline">
                        {item.product_name}
                      </Link>
                    </td>
                    <td className="font-mono text-xs text-content-tertiary">{item.batch_number}</td>
                    <td>{formatQuantity(item.quantity, item.unit)}</td>
                    <td className="text-content-secondary">{item.storage_location || '—'}</td>
                    <td>
                      {formatDate(item.expiry_date)}
                      <span
                        className={
                          item.days_until_expiry < 0
                            ? 'ml-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400'
                            : item.days_until_expiry <= 2
                              ? 'ml-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400'
                              : 'ml-1.5 text-xs text-content-tertiary'
                        }
                      >
                        {daysUntilLabel(item.days_until_expiry)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="font-semibold tabular-nums"
                        style={{ color: scoreColor(item.freshness_score) }}
                      >
                        {item.freshness_score === null || item.freshness_score === undefined
                          ? '—'
                          : Math.round(item.freshness_score)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.freshness_category} />
                    </td>
                  </tr>
                ))}
                {!data.upcoming_expiries?.length && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-content-tertiary">
                      No batches are approaching expiry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
