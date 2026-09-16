/** Inventory rotation: FIFO / FEFO pick list with the reasoning shown. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { batchApi, storageApi } from '../services';
import { useMeta } from '../context/MetaContext';
import { useAsync, useDocumentTitle } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  InlineNotice,
  ScoreBar,
  Select,
  SkeletonTable,
  Stat,
  StatusBadge,
} from '../components/ui';
import {
  categoryIcon,
  daysUntilLabel,
  formatDate,
  formatNumber,
  formatQuantity,
  scoreColor,
} from '../utils/format';

const STRATEGY_HELP = {
  FEFO: 'First Expire, First Out — ranks by expiry risk. Best for perishable stock.',
  FIFO: 'First In, First Out — ranks by time in storage. Best for shelf-stable stock.',
};

export default function RotationPage() {
  useDocumentTitle('Inventory rotation');
  const { categories } = useMeta();

  const [strategy, setStrategy] = useState('FEFO');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');

  const { data: locations } = useAsync(storageApi.locations, []);
  const { data, loading, error, refetch } = useAsync(
    () =>
      batchApi.rotation({
        strategy,
        category_slug: category || undefined,
        storage_location: location || undefined,
        limit: 100,
      }),
    [strategy, category, location],
  );

  const items = data?.items || [];
  const urgent = items.filter((item) => item.rotation_priority >= 55).length;
  const overdue = items.filter((item) => item.days_until_expiry !== null && item.days_until_expiry < 0).length;
  const atRiskQuantity = items
    .filter((item) => item.rotation_priority >= 45)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <>
      <PageHeader
        title="Inventory rotation"
        description="Which batches should leave the shelf first, and exactly why."
        actions={
          <Button variant="secondary" size="sm" icon="⟳" onClick={() => refetch()}>
            Recalculate
          </Button>
        }
      />

      <div className="space-y-4">
        <InlineNotice tone="info" title={`${strategy} rotation`}>
          {STRATEGY_HELP[strategy]} Priority is scored 0–100 where a higher number means pick sooner.
        </InlineNotice>

        <StatGrid>
          <Stat label="Batches ranked" value={formatNumber(data?.total_batches)} icon="⟳" />
          <Stat
            label="Urgent (priority ≥ 55)"
            value={formatNumber(urgent)}
            sublabel="Move these today"
            tone={urgent > 0 ? 'warning' : 'positive'}
            icon="!"
          />
          <Stat
            label="Past their date"
            value={formatNumber(overdue)}
            sublabel="Remove from stock"
            tone={overdue > 0 ? 'danger' : 'positive'}
            icon="✕"
          />
          <Stat
            label="Quantity at risk"
            value={formatNumber(atRiskQuantity, 1)}
            sublabel="In high-priority batches"
            icon="▦"
          />
        </StatGrid>

        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Strategy" htmlFor="strategy" hint={STRATEGY_HELP[strategy]}>
                <Select id="strategy" value={strategy} onChange={(event) => setStrategy(event.target.value)}>
                  <option value="FEFO">FEFO — First Expire, First Out</option>
                  <option value="FIFO">FIFO — First In, First Out</option>
                </Select>
              </Field>
              <Field label="Category" htmlFor="category">
                <Select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Storage location" htmlFor="location">
                <Select id="location" value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="">All locations</option>
                  {(locations || []).map((item) => (
                    <option key={item.location_name} value={item.location_name}>
                      {item.location_name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        {loading && !data ? (
          <SkeletonTable rows={10} columns={7} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon="⟳"
              title="Nothing to rotate"
              description="There is no stock with a quantity greater than zero matching these filters."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader
              title="Pick list"
              subtitle={`${items.length} batch(es) ranked — highest priority first`}
            />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Location</th>
                    <th>Expiry</th>
                    <th>Freshness</th>
                    <th className="min-w-[9rem]">Priority</th>
                    <th>Reason</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.batch_id}
                      className={clsx(item.rotation_priority >= 55 && 'bg-amber-50 dark:bg-amber-500/8/50')}
                    >
                      <td className="tabular-nums font-semibold text-content-tertiary">{item.rank}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden="true" className="text-lg">
                            {categoryIcon(item.category_slug)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/batches/${item.batch_id}`}
                              className="block truncate font-medium text-[rgb(var(--accent-ink))] hover:underline"
                            >
                              {item.product_name}
                            </Link>
                            <span className="block truncate font-mono text-xs text-content-tertiary">
                              {item.batch_number}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{formatQuantity(item.quantity, item.unit)}</td>
                      <td className="text-content-secondary">{item.storage_location || '—'}</td>
                      <td className="whitespace-nowrap">
                        {formatDate(item.expiry_date)}
                        <span
                          className={clsx(
                            'ml-1.5 text-xs',
                            item.days_until_expiry !== null && item.days_until_expiry < 0
                              ? 'font-semibold text-rose-600 dark:text-rose-400'
                              : item.days_until_expiry !== null && item.days_until_expiry <= 2
                                ? 'font-semibold text-amber-700 dark:text-amber-400'
                                : 'text-content-tertiary',
                          )}
                        >
                          {daysUntilLabel(item.days_until_expiry)}
                        </span>
                      </td>
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
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-8 flex-none text-right text-sm font-semibold tabular-nums text-content-primary">
                            {Math.round(item.rotation_priority)}
                          </span>
                          <ScoreBar
                            value={item.rotation_priority}
                            color={
                              item.rotation_priority >= 55
                                ? '#e11d48'
                                : item.rotation_priority >= 40
                                  ? '#f59e0b'
                                  : '#16a34a'
                            }
                            className="min-w-[4rem]"
                          />
                        </div>
                      </td>
                      <td className="max-w-xs text-xs text-content-secondary">{item.reason}</td>
                      <td>
                        <Link to={`/batches/${item.batch_id}`}>
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-edge-subtle bg-surface-sunken px-4 py-3 text-xs text-content-tertiary">
              {data.note}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
