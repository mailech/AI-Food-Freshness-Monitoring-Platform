/** Inventory page: search, filters, sorting, pagination, consume/discard actions. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { inventoryApi } from '../services';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDebounced, useDocumentTitle, usePagination } from '../hooks';
import { LayoutGrid, Table2 } from 'lucide-react';
import { PageHeader, StatGrid } from '../components/guards';
import { FoodCard } from '../components/domain';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Pagination,
  Select,
  SkeletonCard,
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

const SORT_OPTIONS = [
  { value: 'expected_expiry_date:asc', label: 'Expiry (soonest first)' },
  { value: 'expected_expiry_date:desc', label: 'Expiry (latest first)' },
  { value: 'rotation_priority:desc', label: 'Rotation priority (highest)' },
  { value: 'created_at:desc', label: 'Recently added' },
  { value: 'quantity:desc', label: 'Quantity (largest)' },
  { value: 'status:asc', label: 'Status' },
];

const EXPIRY_WINDOWS = [
  { value: '', label: 'Any expiry' },
  { value: '1', label: 'Within 1 day' },
  { value: '3', label: 'Within 3 days' },
  { value: '7', label: 'Within 7 days' },
  { value: '14', label: 'Within 14 days' },
  { value: '30', label: 'Within 30 days' },
];

/**
 * Segmented grid/table switch. Uses a radiogroup rather than two buttons so
 * screen readers announce it as one control with a current selection.
 */
function ViewToggle({ view, onChange }) {
  const options = [
    { value: 'table', label: 'Table view', Icon: Table2 },
    { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Inventory layout"
      className="flex items-center gap-0.5 rounded-xl bg-surface-sunken p-0.5 ring-1 ring-inset ring-edge-subtle"
    >
      {options.map(({ value, label, Icon }) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(value)}
            className={clsx(
              'flex h-7 w-8 items-center justify-center rounded-[10px] transition-all duration-micro',
              active
                ? 'bg-surface-raised text-[rgb(var(--accent-ink))] shadow-xs ring-1 ring-inset ring-edge-subtle'
                : 'text-content-tertiary hover:text-content-secondary',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export default function InventoryPage() {
  useDocumentTitle('Inventory');
  const { categories, statusOptions } = useMeta();
  const toast = useToast();
  const pagination = usePagination(20);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [expiryWindow, setExpiryWindow] = useState('');
  const [sort, setSort] = useState('expected_expiry_date:asc');
  const [includeConsumed, setIncludeConsumed] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState(null);
  const [busyId, setBusyId] = useState(null);

  /* Grid vs table is a workflow preference, so it survives navigation and
     reloads rather than resetting to a default the user did not choose. */
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem('ffm.inventory.view') || 'table';
    } catch {
      return 'table';
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('ffm.inventory.view', view);
    } catch {
      /* storage unavailable (private mode) - the choice just will not persist */
    }
  }, [view]);

  const debouncedSearch = useDebounced(search, 350);
  const [sortBy, sortDir] = sort.split(':');

  const { data: locations } = useAsync(inventoryApi.locations, []);
  const { data: summary, refetch: refetchSummary } = useAsync(inventoryApi.summary, []);

  const { data, loading, error, refetch } = useAsync(
    () =>
      inventoryApi.list({
        q: debouncedSearch || undefined,
        status: status || undefined,
        category_slug: category || undefined,
        storage_location: location || undefined,
        expiring_within_days: expiryWindow || undefined,
        include_consumed: includeConsumed || undefined,
        include_discarded: includeConsumed || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page: pagination.page,
        page_size: pagination.pageSize,
      }),
    [
      debouncedSearch,
      status,
      category,
      location,
      expiryWindow,
      includeConsumed,
      sortBy,
      sortDir,
      pagination.page,
      pagination.pageSize,
    ],
  );

  const items = data?.items || [];
  const meta = data?.meta || {};
  const statuses = summary?.status_counts || {};

  const activeFilters = [status, category, location, expiryWindow, debouncedSearch].filter(Boolean).length;

  function clearFilters() {
    setSearch('');
    setStatus('');
    setCategory('');
    setLocation('');
    setExpiryWindow('');
    pagination.setPage(1);
  }

  async function consume(item) {
    setBusyId(item.id);
    try {
      await inventoryApi.consume(item.id);
      toast.success(`Marked ${item.batch?.product?.name || 'item'} as consumed.`);
      refetch();
      refetchSummary();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function discard() {
    if (!pendingDiscard) return;
    setBusyId(pendingDiscard.id);
    try {
      await inventoryApi.discard(pendingDiscard.id, 'discarded from inventory page');
      toast.warning('Item recorded as discarded (counts toward waste tracking).');
      setPendingDiscard(null);
      refetch();
      refetchSummary();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Everything you are tracking, with freshness status, expiry and rotation priority."
        actions={
          <>
            <Link to="/rotation">
              <Button variant="secondary" size="sm" icon="⟳">
                Rotation plan
              </Button>
            </Link>
            <Link to="/batches/new">
              <Button size="sm" icon="＋">
                Add food item
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        <StatGrid>
          <Stat label="Items" value={formatNumber(summary?.total_batches)} sublabel={`${formatNumber(summary?.total_quantity, 0)} total quantity`} icon="▤" />
          <Stat
            label="Fresh & good"
            value={formatNumber((statuses.FRESH ?? 0) + (statuses.GOOD ?? 0))}
            sublabel={`Health index ${summary?.health_index ?? '—'}%`}
            tone="positive"
            icon="✓"
          />
          <Stat
            label="Expiring soon"
            value={formatNumber(summary?.expiring_soon_count)}
            sublabel="Within 3 days"
            tone={summary?.expiring_soon_count > 0 ? 'warning' : 'neutral'}
            icon="⏳"
          />
          <Stat
            label="Expired"
            value={formatNumber(summary?.expired_count)}
            sublabel="Remove from stock"
            tone={summary?.expired_count > 0 ? 'danger' : 'positive'}
            icon="✕"
          />
        </StatGrid>

        {/* ------------------------------------------------------- filters */}
        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Field label="Search" htmlFor="search" className="lg:col-span-2">
                <Input
                  id="search"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    pagination.setPage(1);
                  }}
                  placeholder="Product, brand or batch number"
                />
              </Field>

              <Field label="Category" htmlFor="category">
                <Select
                  id="category"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Freshness / status" htmlFor="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Expiry" htmlFor="expiry">
                <Select
                  id="expiry"
                  value={expiryWindow}
                  onChange={(event) => {
                    setExpiryWindow(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  {EXPIRY_WINDOWS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Storage location" htmlFor="location">
                <Select
                  id="location"
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All locations</option>
                  {(locations || []).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-edge-subtle pt-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-content-secondary">
                  <input
                    type="checkbox"
                    checked={includeConsumed}
                    onChange={(event) => setIncludeConsumed(event.target.checked)}
                    className="h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
                  />
                  Show consumed and discarded
                </label>
                {activeFilters > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              <Field label="Sort by" htmlFor="sort" className="min-w-[15rem]">
                <Select id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* --------------------------------------------------------- table */}
        {loading && !data ? (
          view === 'grid' ? (
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <SkeletonTable rows={8} columns={7} />
          )
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon="▤"
              title={activeFilters ? 'No items match your filters' : 'Your inventory is empty'}
              description={
                activeFilters
                  ? 'Try widening the search or clearing some filters.'
                  : 'Add a food item to start tracking freshness, shelf life and expiry.'
              }
              action={
                activeFilters ? (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Link to="/batches/new">
                    <Button size="sm">Add food item</Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader
              title={`${meta.total} item${meta.total === 1 ? '' : 's'}`}
              subtitle="Higher rotation priority means use it sooner"
              actions={<ViewToggle view={view} onChange={setView} />}
            />
            {view === 'grid' ? (
              <div className="card-body grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <FoodCard
                    key={item.id}
                    batch={item.batch}
                    quantity={item.quantity}
                    unit={item.unit}
                    priority={item.rotation_priority}
                    to={item.batch?.id ? `/batches/${item.batch.id}` : undefined}
                  />
                ))}
              </div>
            ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Location</th>
                    <th>Expiry</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const batch = item.batch || {};
                    const product = batch.product || {};
                    return (
                      <tr key={item.id} className={clsx((item.consumed || item.discarded) && 'opacity-55')}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span aria-hidden="true" className="text-lg">
                              {categoryIcon(product.category_slug)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                to={`/batches/${item.batch_id}`}
                                className="block truncate font-medium text-[rgb(var(--accent-ink))] hover:underline"
                              >
                                {product.name || '—'}
                              </Link>
                              <span className="block truncate font-mono text-xs text-content-tertiary">
                                {batch.batch_number}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">{formatQuantity(item.quantity, item.unit)}</td>
                        <td className="text-content-secondary">{item.storage_location || '—'}</td>
                        <td className="whitespace-nowrap">
                          {formatDate(item.expected_expiry_date)}
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
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="tabular-nums text-content-secondary">
                          {item.rotation_priority === null || item.rotation_priority === undefined
                            ? '—'
                            : Math.round(item.rotation_priority)}
                        </td>
                        <td>
                          {!item.consumed && !item.discarded ? (
                            <div className="flex flex-nowrap gap-1.5">
                              <Link to={`/analyze?batch=${item.batch_id}`}>
                                <Button size="sm" variant="ghost" title="Analyse freshness">
                                  ⌾
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={busyId === item.id}
                                onClick={() => consume(item)}
                              >
                                Used
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 dark:text-rose-400"
                                onClick={() => setPendingDiscard(item)}
                              >
                                Discard
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-content-tertiary">
                              {item.consumed ? 'Consumed' : 'Discarded'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
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

      <ConfirmDialog
        open={Boolean(pendingDiscard)}
        onClose={() => setPendingDiscard(null)}
        onConfirm={discard}
        loading={busyId === pendingDiscard?.id}
        title="Record this item as discarded?"
        description={`${
          pendingDiscard?.batch?.product?.name || 'This item'
        } will be marked as waste and its quantity removed from the batch. This is recorded in the waste-reduction analytics.`}
        confirmLabel="Discard item"
      />
    </>
  );
}
