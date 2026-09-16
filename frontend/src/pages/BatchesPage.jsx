/** Batches list: grid/table views with the full filter surface. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { batchApi } from '../services';
import { useMeta } from '../context/MetaContext';
import { useAsync, useDebounced, useDocumentTitle, useLocalStorage, usePagination } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Pagination,
  Select,
  SkeletonCard,
  SkeletonTable,
  StatusBadge,
} from '../components/ui';
import { BatchCard } from '../components/domain';
import {
  categoryIcon,
  daysUntilLabel,
  formatDate,
  formatQuantity,
  scoreColor,
} from '../utils/format';

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'expected_expiry_date:asc', label: 'Expiry (soonest)' },
  { value: 'current_freshness_score:asc', label: 'Freshness (lowest)' },
  { value: 'current_freshness_score:desc', label: 'Freshness (highest)' },
  { value: 'remaining_shelf_life_days:asc', label: 'Shelf life (shortest)' },
  { value: 'quantity:desc', label: 'Quantity (largest)' },
  { value: 'batch_number:asc', label: 'Batch number' },
];

export default function BatchesPage() {
  useDocumentTitle('Batches');
  const { categories, freshnessOptions, statusOptions } = useMeta();
  const pagination = usePagination(20);
  const [view, setView] = useLocalStorage('ffm.batches.view', 'table');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [freshness, setFreshness] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [location, setLocation] = useState('');
  const [expiring, setExpiring] = useState('');
  const [purchasedFrom, setPurchasedFrom] = useState('');
  const [purchasedTo, setPurchasedTo] = useState('');
  const [sort, setSort] = useState('created_at:desc');
  const [includeArchived, setIncludeArchived] = useState(false);

  const debouncedSearch = useDebounced(search, 350);
  const debouncedBatchNumber = useDebounced(batchNumber, 350);
  const debouncedLocation = useDebounced(location, 350);
  const [sortBy, sortDir] = sort.split(':');

  const { data, loading, error, refetch } = useAsync(
    () =>
      batchApi.list({
        q: debouncedSearch || undefined,
        category_slug: category || undefined,
        status: status || undefined,
        freshness_category: freshness || undefined,
        batch_number: debouncedBatchNumber || undefined,
        storage_location: debouncedLocation || undefined,
        expiring_within_days: expiring || undefined,
        purchased_from: purchasedFrom || undefined,
        purchased_to: purchasedTo || undefined,
        include_archived: includeArchived || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page: pagination.page,
        page_size: pagination.pageSize,
      }),
    [
      debouncedSearch,
      category,
      status,
      freshness,
      debouncedBatchNumber,
      debouncedLocation,
      expiring,
      purchasedFrom,
      purchasedTo,
      includeArchived,
      sortBy,
      sortDir,
      pagination.page,
      pagination.pageSize,
    ],
  );

  const batches = data?.items || [];
  const meta = data?.meta || {};

  const activeFilters = [
    debouncedSearch,
    category,
    status,
    freshness,
    debouncedBatchNumber,
    debouncedLocation,
    expiring,
    purchasedFrom,
    purchasedTo,
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch('');
    setCategory('');
    setStatus('');
    setFreshness('');
    setBatchNumber('');
    setLocation('');
    setExpiring('');
    setPurchasedFrom('');
    setPurchasedTo('');
    pagination.setPage(1);
  }

  const onFilterChange = (setter) => (event) => {
    setter(event.target.value);
    pagination.setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Batches"
        description="Every physical lot with its freshness score, shelf life and storage location."
        actions={
          <>
            <div className="flex overflow-hidden rounded-xl border border-edge">
              {['table', 'grid'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium capitalize transition',
                    view === mode ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]' : 'bg-surface-raised text-content-secondary hover:bg-surface-sunken',
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <Link to="/batches/new">
              <Button size="sm" icon="＋">
                New batch
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Search" htmlFor="search">
                <Input
                  id="search"
                  type="search"
                  value={search}
                  onChange={onFilterChange(setSearch)}
                  placeholder="Product, supplier, location…"
                />
              </Field>
              <Field label="Batch number" htmlFor="batch-number">
                <Input
                  id="batch-number"
                  value={batchNumber}
                  onChange={onFilterChange(setBatchNumber)}
                  placeholder="BTCH-20260915-0001"
                />
              </Field>
              <Field label="Category" htmlFor="category">
                <Select id="category" value={category} onChange={onFilterChange(setCategory)}>
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Freshness band" htmlFor="freshness">
                <Select id="freshness" value={freshness} onChange={onFilterChange(setFreshness)}>
                  <option value="">Any freshness</option>
                  {freshnessOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" value={status} onChange={onFilterChange(setStatus)}>
                  <option value="">Any status</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Storage location" htmlFor="location">
                <Input
                  id="location"
                  value={location}
                  onChange={onFilterChange(setLocation)}
                  placeholder="Cold Room A"
                />
              </Field>
              <Field label="Expiring within (days)" htmlFor="expiring">
                <Select id="expiring" value={expiring} onChange={onFilterChange(setExpiring)}>
                  <option value="">Any</option>
                  {[1, 3, 7, 14, 30].map((days) => (
                    <option key={days} value={days}>
                      {days} day{days > 1 ? 's' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sort by" htmlFor="sort">
                <Select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Purchased from" htmlFor="from">
                <Input id="from" type="date" value={purchasedFrom} onChange={onFilterChange(setPurchasedFrom)} />
              </Field>
              <Field label="Purchased to" htmlFor="to">
                <Input id="to" type="date" value={purchasedTo} onChange={onFilterChange(setPurchasedTo)} />
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-edge-subtle pt-3">
              <label className="flex items-center gap-2 text-xs text-content-secondary">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) => setIncludeArchived(event.target.checked)}
                  className="h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
                />
                Include archived batches
              </label>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                </Button>
              )}
              <span className="ml-auto text-xs text-content-tertiary">
                {meta.total ?? 0} batch{meta.total === 1 ? '' : 'es'} found
              </span>
            </div>
          </CardBody>
        </Card>

        {loading && !data ? (
          view === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonCard key={index} lines={4} />
              ))}
            </div>
          ) : (
            <SkeletonTable rows={8} columns={8} />
          )
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : batches.length === 0 ? (
          <Card>
            <EmptyState
              icon="▦"
              title={activeFilters ? 'No batches match your filters' : 'No batches yet'}
              description={
                activeFilters
                  ? 'Adjust the filters to widen the search.'
                  : 'Create a batch to start tracking a lot of product.'
              }
              action={
                activeFilters ? (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Link to="/batches/new">
                    <Button size="sm">Create a batch</Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : view === 'grid' ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {batches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
            <Card>
              <Pagination
                page={pagination.page}
                totalPages={meta.total_pages}
                total={meta.total}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </Card>
          </>
        ) : (
          <Card className="overflow-hidden">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Location</th>
                    <th>Expiry</th>
                    <th>Shelf life</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className={clsx(batch.is_archived && 'opacity-55')}>
                      <td>
                        <Link
                          to={`/batches/${batch.id}`}
                          className="font-mono text-xs font-medium text-[rgb(var(--accent-ink))] hover:underline"
                        >
                          {batch.batch_number}
                        </Link>
                        {batch.is_archived && (
                          <span className="ml-1.5 text-[10px] uppercase text-content-tertiary">archived</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true">{categoryIcon(batch.product?.category_slug)}</span>
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-content-primary">
                              {batch.product?.name}
                            </span>
                            <span className="block truncate text-xs text-content-tertiary">
                              {batch.product?.category_name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{formatQuantity(batch.quantity, batch.unit)}</td>
                      <td className="text-content-secondary">{batch.storage_location || '—'}</td>
                      <td className="whitespace-nowrap">
                        {formatDate(batch.expected_expiry_date)}
                        <span
                          className={clsx(
                            'ml-1.5 text-xs',
                            batch.days_until_expiry !== null && batch.days_until_expiry < 0
                              ? 'font-semibold text-rose-600 dark:text-rose-400'
                              : batch.days_until_expiry !== null && batch.days_until_expiry <= 2
                                ? 'font-semibold text-amber-700 dark:text-amber-400'
                                : 'text-content-tertiary',
                          )}
                        >
                          {daysUntilLabel(batch.days_until_expiry)}
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {batch.remaining_shelf_life_days === null ||
                        batch.remaining_shelf_life_days === undefined
                          ? '—'
                          : `${Number(batch.remaining_shelf_life_days).toFixed(1)} d`}
                      </td>
                      <td>
                        <span
                          className="font-semibold tabular-nums"
                          style={{ color: scoreColor(batch.current_freshness_score) }}
                        >
                          {batch.current_freshness_score === null ||
                          batch.current_freshness_score === undefined
                            ? '—'
                            : Math.round(batch.current_freshness_score)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={batch.current_freshness_category || batch.status} />
                      </td>
                      <td>
                        <Link to={`/analyze?batch=${batch.id}`}>
                          <Button size="sm" variant="ghost" title="Analyse this batch">
                            ⌾
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              totalPages={meta.total_pages}
              total={meta.total}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </Card>
        )}
      </div>
    </>
  );
}
