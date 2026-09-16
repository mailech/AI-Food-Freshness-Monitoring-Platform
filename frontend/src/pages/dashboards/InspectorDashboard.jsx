/** Inspector dashboard: inspection queue, spoilage indicators, confidence and history. */
import { Link } from 'react-router-dom';
import {
  CircleDashed,
  Leaf,
  ScanLine,
  Search,
  Target,
  XCircle,
} from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import clsx from 'clsx';
import { alertApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { PageHeader, StatGrid } from '../../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  Stat,
  StatusBadge,
} from '../../components/ui';
import { AlertList } from '../../components/domain';
import { FreshnessTrendChart, IndicatorFrequencyChart } from '../../charts';
import {
  daysUntilLabel,
  formatDate,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatRelative,
  scoreColor,
  titleise,
} from '../../utils/format';

export default function InspectorDashboard({ data, refetch, greeting }) {
  const toast = useToast();
  const spoilage = data.spoilage || {};
  const health = data.inventory_health || {};
  const queue = data.inspection_queue || [];
  const indicators = data.indicator_summary || [];

  const averageConfidence =
    data.recent_assessments?.length > 0
      ? data.recent_assessments.reduce((sum, item) => sum + (item.confidence || 0), 0) /
        data.recent_assessments.length
      : null;

  async function updateAlert(id, payload) {
    await alertApi.update(id, payload);
    toast.success('Alert updated.');
    refetch();
  }

  return (
    <>
      <DashboardHero
        name={greeting.replace('Welcome back, ', '')}
        roleLabel="Quality Inspector"
        score={health.average_freshness_score}
        scoreLabel="Average quality"
        headline="Your inspection queue and the spoilage evidence behind every score."
        subheadline="Batches are ranked by whether they have ever been assessed, their score and their expiry."
        stats={[
          { label: 'In queue', value: formatNumber(queue.length) },
          { label: 'Never assessed', value: formatNumber(queue.filter((i) => !i.last_assessed_at).length) },
          { label: 'Spoilage rate', value: spoilage.spoilage_rate_pct ?? 0, suffix: '%' },
        ]}
        className="mb-5"
      />

      <PageHeader
        title="Quality overview"
        description="Inspection workload and detection activity."
        actions={
          <Link to="/analyze">
            <Button size="sm" icon={<ScanLine />}>
              Inspect a batch
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        <StatGrid columns={5}>
          <Stat label="Inspection queue" value={formatNumber(queue.length)} sublabel="Batches to review" icon={<Search />} />
          <Stat
            label="Never assessed"
            value={formatNumber(queue.filter((item) => !item.last_assessed_at).length)}
            sublabel="No image analysis yet"
            tone="warning"
            icon={<CircleDashed />}
          />
          <Stat
            label="Spoiled / expired"
            value={formatNumber(spoilage.spoiled_count + spoilage.expired_count)}
            sublabel={`Spoilage rate ${spoilage.spoilage_rate_pct ?? 0}%`}
            tone={spoilage.spoiled_count + spoilage.expired_count > 0 ? 'danger' : 'positive'}
            icon={<XCircle />}
          />
          <Stat
            label="Avg quality score"
            value={health.average_freshness_score ? `${Math.round(health.average_freshness_score)}/100` : '—'}
            sublabel={`${formatNumber(spoilage.near_spoilage_count)} near spoilage`}
            tone={health.average_freshness_score >= 75 ? 'positive' : 'warning'}
            icon={<Leaf />}
          />
          <Stat
            label="Avg AI confidence"
            value={averageConfidence !== null ? formatPercent(averageConfidence, { fromFraction: true }) : '—'}
            sublabel="Across recent analyses"
            tone="info"
            icon={<Target />}
          />
        </StatGrid>

        {/* ------------------------------------------------ inspection queue */}
        <Card>
          <CardHeader
            title="Inspection queue"
            subtitle="Prioritised by whether a batch has ever been assessed, its score and its expiry"
            actions={
              <Link to="/inspections">
                <Button variant="ghost" size="sm">
                  Full queue →
                </Button>
              </Link>
            }
          />
          {queue.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Score</th>
                    <th>Last assessed</th>
                    <th>Expiry</th>
                    <th>Why</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {queue.slice(0, 10).map((item) => (
                    <tr key={item.batch_id}>
                      <td>
                        <Link
                          to={`/batches/${item.batch_id}`}
                          className="font-mono text-xs font-medium text-[rgb(var(--accent-ink))] hover:underline"
                        >
                          {item.batch_number}
                        </Link>
                      </td>
                      <td className="font-medium">{item.product_name}</td>
                      <td>{formatQuantity(item.quantity, item.unit)}</td>
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
                      <td className="text-xs text-content-tertiary">
                        {item.last_assessed_at ? formatRelative(item.last_assessed_at) : 'Never'}
                      </td>
                      <td className="text-xs">
                        {formatDate(item.expiry_date)}
                        <span
                          className={clsx(
                            'ml-1.5',
                            item.days_until_expiry !== null && item.days_until_expiry <= 2
                              ? 'font-semibold text-amber-700 dark:text-amber-400'
                              : 'text-content-tertiary',
                          )}
                        >
                          {daysUntilLabel(item.days_until_expiry)}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {item.reasons.map((reason, index) => (
                            <Badge key={index} className="bg-surface-sunken text-content-secondary ring-edge-subtle">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Link to={`/analyze?batch=${item.batch_id}`}>
                          <Button size="sm" variant="secondary">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="✅"
              title="Nothing waiting for inspection"
              description="Every active batch has a recent assessment."
            />
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* --------------------------------------- indicator frequency */}
          <Card>
            <CardHeader
              title="Spoilage indicators detected"
              subtitle="Frequency over the last 30 days"
              actions={<DemoBadge label="Baseline detector" />}
            />
            <CardBody>
              <IndicatorFrequencyChart indicators={indicators} />
              {indicators.length > 0 && (
                <p className="mt-3 text-xs leading-relaxed text-content-tertiary">
                  Detections come from the OpenCV baseline detector. Confidence values are the
                  detector&apos;s own scores, not validated accuracy figures.
                </p>
              )}
            </CardBody>
          </Card>

          {/* --------------------------------------------- quality trend */}
          <Card>
            <CardHeader title="Quality score trend" subtitle="Average freshness over 30 days" />
            <CardBody>
              <FreshnessTrendChart points={data.freshness_trend?.points || []} height={260} />
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* -------------------------------------- image analysis history */}
          <Card>
            <CardHeader
              title="Recently analysed products"
              subtitle="Image analysis history with confidence"
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
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-content-tertiary">
                          <span className="font-mono">{item.batch_number}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelative(item.created_at)}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            confidence {formatPercent(item.confidence, { fromFraction: true })}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1">
                        <StatusBadge status={item.freshness_category} />
                        {item.spoilage_probability !== null && (
                          <span className="text-xs text-content-tertiary">
                            spoilage {formatPercent(item.spoilage_probability, { fromFraction: true })}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="📷"
                title="No analyses recorded yet"
                description="Upload an image for a batch to build the inspection history."
              />
            )}
          </Card>

          {/* --------------------------------------------------- alerts */}
          <Card>
            <CardHeader
              title="Quality alerts"
              subtitle="Spoilage and freshness alerts needing review"
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

        {/* --------------------------------------------- indicator table */}
        {indicators.length > 0 && (
          <Card>
            <CardHeader title="Indicator detail" subtitle="Average confidence and affected surface area" />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Indicator</th>
                    <th>Detections</th>
                    <th>Average confidence</th>
                    <th>Average affected area</th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((indicator) => (
                    <tr key={indicator.indicator_type}>
                      <td className="font-medium">{titleise(indicator.indicator_type)}</td>
                      <td className="tabular-nums">{formatNumber(indicator.detection_count)}</td>
                      <td className="tabular-nums">
                        {formatPercent(indicator.average_confidence, { fromFraction: true })}
                      </td>
                      <td className="tabular-nums">
                        {formatPercent(indicator.average_affected_area, { fromFraction: true, digits: 1 })}
                      </td>
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
