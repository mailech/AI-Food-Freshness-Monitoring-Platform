/** Consumer dashboard: personal pantry, expiries, advice and a prominent scan CTA. */
import { Link } from 'react-router-dom';
import { alertApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import {
  AlertTriangle,
  Boxes,
  Clock,
  Leaf,
} from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import { StatGrid } from '../../components/guards';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Stat,
  StatusBadge,
} from '../../components/ui';
import { AlertList, RecommendationList } from '../../components/domain';
import { FreshnessDistributionChart } from '../../charts';
import {
  categoryIcon,
  daysUntilLabel,
  formatDate,
  formatQuantity,
  formatRelative,
  scoreColor,
} from '../../utils/format';

export default function ConsumerDashboard({ data, refetch, greeting }) {
  const toast = useToast();
  const health = data.inventory_health || {};
  const statuses = health.status_counts || {};

  async function updateAlert(id, payload) {
    await alertApi.update(id, payload);
    toast.success('Alert updated.');
    refetch();
  }

  return (
    <>
      <DashboardHero
        name={greeting.replace('Welcome back, ', '')}
        roleLabel="Consumer"
        score={health.average_freshness_score}
        scoreLabel="Average freshness"
        headline="Not sure if it is still good? Photograph it and find out."
        subheadline="Upload a photo, add the storage conditions, and get a freshness score, spoilage indicators and an estimated shelf life."
        stats={[
          { label: 'Items tracked', value: health.total_batches ?? 0 },
          { label: 'Expiring soon', value: health.expiring_soon_count ?? 0, suffix: 'in 3 days' },
          {
            label: 'Needs attention',
            value: (statuses.NEAR_SPOILAGE ?? 0) + (statuses.SPOILED ?? 0) + (statuses.EXPIRED ?? 0),
          },
        ]}
        className="mb-5"
      />

      <div className="space-y-5">
        <StatGrid>
          <Stat
            label="Items tracked"
            value={health.total_batches ?? 0}
            sublabel={`${health.total_quantity ?? 0} total quantity`}
            icon={<Boxes />}
          />
          <Stat
            label="Average freshness"
            value={health.average_freshness_score ? `${Math.round(health.average_freshness_score)}/100` : '—'}
            sublabel="Across assessed items"
            tone={
              health.average_freshness_score >= 75
                ? 'positive'
                : health.average_freshness_score >= 60
                  ? 'neutral'
                  : 'warning'
            }
            icon={<Leaf />}
          />
          <Stat
            label="Expiring soon"
            value={health.expiring_soon_count ?? 0}
            sublabel="Within the next 3 days"
            tone={health.expiring_soon_count > 0 ? 'warning' : 'neutral'}
            icon={<Clock />}
          />
          <Stat
            label="Needs attention"
            value={(statuses.NEAR_SPOILAGE ?? 0) + (statuses.SPOILED ?? 0) + (statuses.EXPIRED ?? 0)}
            sublabel="Near spoilage, spoiled or expired"
            tone={
              (statuses.SPOILED ?? 0) + (statuses.EXPIRED ?? 0) > 0
                ? 'danger'
                : (statuses.NEAR_SPOILAGE ?? 0) > 0
                  ? 'warning'
                  : 'positive'
            }
            icon={<AlertTriangle />}
          />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* -------------------------------------------- upcoming expiries */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Use these first"
              subtitle="Items closest to their expiry date"
              actions={
                <Link to="/inventory">
                  <Button variant="ghost" size="sm">
                    All inventory →
                  </Button>
                </Link>
              }
            />
            {data.upcoming_expiries?.length ? (
              <ul className="divide-y divide-edge-subtle">
                {data.upcoming_expiries.map((item) => (
                  <li key={item.batch_id}>
                    <Link
                      to={`/batches/${item.batch_id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-[rgb(var(--accent)/0.05)]"
                    >
                      <span aria-hidden="true" className="text-xl">
                        {categoryIcon(item.category_slug)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-content-primary">{item.product_name}</p>
                        <p className="mt-0.5 text-xs text-content-tertiary">
                          {formatQuantity(item.quantity, item.unit)} · expires{' '}
                          {formatDate(item.expiry_date)}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-3">
                        <span
                          className={
                            item.days_until_expiry < 0
                              ? 'text-xs font-semibold text-rose-600 dark:text-rose-400'
                              : item.days_until_expiry <= 2
                                ? 'text-xs font-semibold text-amber-700 dark:text-amber-400'
                                : 'text-xs text-content-tertiary'
                          }
                        >
                          {daysUntilLabel(item.days_until_expiry)}
                        </span>
                        <StatusBadge status={item.freshness_category} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="🥗"
                title="Nothing expiring soon"
                description="Add food items to start tracking their freshness and expiry."
                action={
                  <Link to="/batches/new">
                    <Button size="sm">Add a food item</Button>
                  </Link>
                }
              />
            )}
          </Card>

          {/* ------------------------------------------- freshness overview */}
          <Card>
            <CardHeader title="Freshness overview" subtitle="How your items are distributed" />
            <CardBody>
              <FreshnessDistributionChart
                items={data.freshness_distribution?.items || []}
                variant="pie"
                height={230}
              />
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ------------------------------------------------- recent scans */}
          <Card>
            <CardHeader
              title="Recent scans"
              subtitle="Your latest freshness analyses"
              actions={
                <Link to="/analyze">
                  <Button variant="ghost" size="sm">
                    New scan
                  </Button>
                </Link>
              }
            />
            {data.recent_assessments?.length ? (
              <ul className="divide-y divide-edge-subtle">
                {data.recent_assessments.map((item) => (
                  <li key={item.assessment_id}>
                    <Link
                      to={`/batches/${item.batch_id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-[rgb(var(--accent)/0.05)]"
                    >
                      <span
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-sm font-semibold tabular-nums text-white"
                        style={{ backgroundColor: scoreColor(item.freshness_score) }}
                      >
                        {Math.round(item.freshness_score)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-content-primary">{item.product_name}</p>
                        <p className="mt-0.5 text-xs text-content-tertiary">{formatRelative(item.created_at)}</p>
                      </div>
                      <StatusBadge status={item.freshness_category} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="📷"
                title="No scans yet"
                description="Analyse a food photo to see freshness estimates here."
                action={
                  <Link to="/analyze">
                    <Button size="sm">Analyse food</Button>
                  </Link>
                }
              />
            )}
          </Card>

          {/* ------------------------------------------------ alerts */}
          <Card>
            <CardHeader
              title="Alerts"
              subtitle="Things that need your attention"
              actions={
                <Link to="/alerts">
                  <Button variant="ghost" size="sm">
                    All alerts →
                  </Button>
                </Link>
              }
            />
            <AlertList alerts={data.open_alerts || []} onUpdate={updateAlert} compact />
          </Card>
        </div>

        {/* --------------------------------------------- recommendations */}
        <Card>
          <CardHeader
            title="Recommendations for you"
            subtitle="Storage, consumption and waste-reduction advice, with the reasoning shown"
          />
          <CardBody>
            <RecommendationList
              recommendations={data.my_recommendations || []}
              onAcknowledged={() => refetch()}
              emptyTitle="No recommendations yet"
            />
          </CardBody>
        </Card>

        {/* --------------------------------------------------- rotation */}
        {data.rotation?.items?.length > 0 && (
          <Card>
            <CardHeader
              title="Suggested order of use"
              subtitle={`${data.rotation.strategy} — ${data.rotation.note}`}
              actions={
                <Link to="/rotation">
                  <Button variant="ghost" size="sm">
                    Full plan →
                  </Button>
                </Link>
              }
            />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Expiry</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rotation.items.map((item) => (
                    <tr key={item.batch_id}>
                      <td className="tabular-nums text-content-tertiary">{item.rank}</td>
                      <td>
                        <Link to={`/batches/${item.batch_id}`} className="font-medium text-[rgb(var(--accent-ink))] hover:underline">
                          {item.product_name}
                        </Link>
                        <p className="text-xs text-content-tertiary">{item.reason}</p>
                      </td>
                      <td>{formatQuantity(item.quantity, item.unit)}</td>
                      <td>
                        {formatDate(item.expiry_date)}
                        <span className="ml-1.5 text-xs text-content-tertiary">
                          ({daysUntilLabel(item.days_until_expiry)})
                        </span>
                      </td>
                      <td className="tabular-nums font-medium">{Math.round(item.rotation_priority)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
