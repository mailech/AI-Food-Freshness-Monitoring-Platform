/** Inspection queue for quality inspectors. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { analyticsApi } from '../services';
import { useAsync, useDocumentTitle } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  ErrorState,
  Field,
  Select,
  SkeletonTable,
  Stat,
  StatusBadge,
} from '../components/ui';
import { IndicatorFrequencyChart } from '../charts';
import {
  categoryIcon,
  daysUntilLabel,
  formatDate,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatRelative,
  scoreColor,
  titleise,
} from '../utils/format';

export default function InspectionsPage() {
  useDocumentTitle('Inspection queue');
  const [limit, setLimit] = useState(30);
  const [filter, setFilter] = useState('all');

  const { data, loading, error, refetch } = useAsync(
    () => analyticsApi.inspectionQueue(limit),
    [limit],
  );
  const { data: indicators } = useAsync(() => analyticsApi.indicators(30), []);

  const queue = data || [];
  const filtered =
    filter === 'never'
      ? queue.filter((item) => !item.last_assessed_at)
      : filter === 'low'
        ? queue.filter((item) => item.freshness_score !== null && item.freshness_score < 60)
        : filter === 'expiring'
          ? queue.filter((item) => item.days_until_expiry !== null && item.days_until_expiry <= 2)
          : queue;

  return (
    <>
      <PageHeader
        title="Inspection queue"
        description="Batches prioritised for physical inspection and image analysis."
        actions={
          <Button variant="secondary" size="sm" icon="⟳" onClick={refetch}>
            Refresh
          </Button>
        }
      />

      <div className="space-y-4">
        <StatGrid>
          <Stat label="In queue" value={formatNumber(queue.length)} icon="🔍" />
          <Stat
            label="Never assessed"
            value={formatNumber(queue.filter((item) => !item.last_assessed_at).length)}
            sublabel="No image analysis yet"
            tone="warning"
            icon="◌"
          />
          <Stat
            label="Low score (<60)"
            value={formatNumber(queue.filter((i) => i.freshness_score !== null && i.freshness_score < 60).length)}
            sublabel="Quality concern"
            tone="danger"
            icon="!"
          />
          <Stat
            label="Expiring ≤ 2 days"
            value={formatNumber(queue.filter((i) => i.days_until_expiry !== null && i.days_until_expiry <= 2).length)}
            tone="warning"
            icon="⏳"
          />
        </StatGrid>

        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Show" htmlFor="filter">
                <Select id="filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">Everything in the queue</option>
                  <option value="never">Never assessed</option>
                  <option value="low">Low freshness score</option>
                  <option value="expiring">Expiring within 2 days</option>
                </Select>
              </Field>
              <Field label="Queue size" htmlFor="limit">
                <Select id="limit" value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
                  {[10, 20, 30, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      Top {value}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        {loading && !data ? (
          <SkeletonTable rows={10} columns={8} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon="✅"
              title="Nothing waiting"
              description="Every batch matching this filter has a recent assessment."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader
              title={`${filtered.length} batch(es) to inspect`}
              subtitle="Ranked by whether the batch has ever been assessed, its score and its expiry"
            />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Location</th>
                    <th>Score</th>
                    <th>Last assessed</th>
                    <th>Expiry</th>
                    <th>Reasons</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.batch_id} className={clsx(!item.last_assessed_at && 'bg-amber-50/50 dark:bg-amber-500/6')}>
                      <td>
                        <Link
                          to={`/batches/${item.batch_id}`}
                          className="font-mono text-xs font-medium text-[rgb(var(--accent-ink))] hover:underline"
                        >
                          {item.batch_number}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true">{categoryIcon(item.category_slug)}</span>
                          <span className="font-medium">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{formatQuantity(item.quantity, item.unit)}</td>
                      <td className="text-content-secondary">{item.storage_location || '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-semibold tabular-nums"
                            style={{ color: scoreColor(item.freshness_score) }}
                          >
                            {item.freshness_score === null || item.freshness_score === undefined
                              ? '—'
                              : Math.round(item.freshness_score)}
                          </span>
                          {item.freshness_category && (
                            <StatusBadge status={item.freshness_category} showIcon={false} />
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-xs text-content-tertiary">
                        {item.last_assessed_at ? formatRelative(item.last_assessed_at) : 'Never'}
                      </td>
                      <td className="whitespace-nowrap text-xs">
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
                          <Button size="sm" icon="⌾">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Spoilage indicators detected"
            subtitle="Frequency across the last 30 days of analyses"
            actions={<DemoBadge label="Baseline detector" />}
          />
          <CardBody>
            <IndicatorFrequencyChart indicators={indicators || []} height={280} />
            {indicators?.length > 0 && (
              <div className="table-wrap mt-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Indicator</th>
                      <th>Detections</th>
                      <th>Avg confidence</th>
                      <th>Avg affected area</th>
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
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
