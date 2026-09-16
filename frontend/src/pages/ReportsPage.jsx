/** Reports: generate the five report types as PDF or XLSX and download them. */
import { useState } from 'react';
import clsx from 'clsx';
import { downloadBlob, reportApi } from '../services';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDocumentTitle, usePagination } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  InlineNotice,
  Input,
  Pagination,
  Select,
  SkeletonTable,
  Spinner,
} from '../components/ui';
import { formatBytes, formatDateTime, formatNumber, titleise } from '../utils/format';

const REPORT_TYPES = [
  {
    value: 'FRESHNESS',
    label: 'Freshness Report',
    icon: '🍃',
    description: 'Freshness scores per batch with the component breakdown, distribution and 30-day trend.',
  },
  {
    value: 'SHELF_LIFE',
    label: 'Shelf-Life Report',
    icon: '⏳',
    description: 'Remaining shelf life, predicted expiry, risk level and which predictions are baseline vs trained.',
  },
  {
    value: 'INVENTORY_QUALITY',
    label: 'Inventory Quality Report',
    icon: '▦',
    description: 'Stock levels, status mix and quality by category with the full inventory detail table.',
  },
  {
    value: 'WASTE_REDUCTION',
    label: 'Waste Reduction Report',
    icon: '♻',
    description: 'Quantity and value at risk plus the recommended interventions from the rule engine.',
  },
  {
    value: 'STORAGE_COMPLIANCE',
    label: 'Storage Compliance Report',
    icon: '❄',
    description: 'Compliance status, recorded violations, open storage alerts and environmental trends.',
  },
];

export default function ReportsPage() {
  useDocumentTitle('Reports');
  const { categories, statusOptions, freshnessOptions } = useMeta();
  const toast = useToast();
  const pagination = usePagination(10);

  const [selected, setSelected] = useState('FRESHNESS');
  const [format, setFormat] = useState('PDF');
  const [filters, setFilters] = useState({
    title: '',
    date_from: '',
    date_to: '',
    category_slug: '',
    storage_location: '',
    status: '',
    freshness_category: '',
    limit: 500,
  });
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, refetch } = useAsync(
    () => reportApi.list({ page: pagination.page, page_size: pagination.pageSize }),
    [pagination.page, pagination.pageSize],
  );

  const reports = data?.items || [];
  const meta = data?.meta || {};
  const activeType = REPORT_TYPES.find((type) => type.value === selected);

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function generate() {
    setGenerating(true);
    try {
      const payload = {
        report_format: format,
        title: filters.title.trim() || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        category_slug: filters.category_slug || undefined,
        storage_location: filters.storage_location.trim() || undefined,
        status: filters.status ? [filters.status] : undefined,
        freshness_category: filters.freshness_category ? [filters.freshness_category] : undefined,
        limit: Number(filters.limit) || 500,
      };
      const report = await reportApi.generate(selected, payload);
      toast.success(
        `${report.title} generated (${formatNumber(report.row_count)} rows, ${formatBytes(
          report.size_bytes,
        )}).`,
      );
      refetch();
      // Download immediately: the point of the page is getting the file.
      await download(report);
    } catch (err) {
      toast.apiError(err, 'The report could not be generated.');
    } finally {
      setGenerating(false);
    }
  }

  async function download(report) {
    setDownloadingId(report.id);
    try {
      const response = await reportApi.download(report.id);
      const filename = downloadBlob(response, report.filename || 'report');
      toast.success(`Downloaded ${filename}.`);
    } catch (err) {
      toast.apiError(err, 'The download failed.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await reportApi.remove(pendingDelete.id);
      toast.success('Report deleted.');
      setPendingDelete(null);
      refetch();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate freshness, shelf-life, inventory quality, waste reduction and storage compliance reports as PDF or Excel."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ------------------------------------------------------ builder */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="1. Choose a report type" />
            <CardBody>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {REPORT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelected(type.value)}
                    aria-pressed={selected === type.value}
                    className={clsx(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
                      selected === type.value
                        ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.07)] ring-2 ring-[rgb(var(--accent)/0.25)]'
                        : 'border-edge-subtle hover:border-[rgb(var(--accent)/0.4)] hover:bg-[rgb(var(--accent)/0.05)]',
                    )}
                  >
                    <span aria-hidden="true" className="text-xl">
                      {type.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-content-primary">{type.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-content-secondary">
                        {type.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="2. Apply filters"
              subtitle="All filters are optional and are recorded in the report metadata"
            />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Report title" htmlFor="title" hint="Defaults to the report type name" className="sm:col-span-2">
                  <Input
                    id="title"
                    value={filters.title}
                    onChange={(event) => update('title', event.target.value)}
                    placeholder={activeType?.label}
                  />
                </Field>
                <Field label="Row limit" htmlFor="limit">
                  <Select id="limit" value={filters.limit} onChange={(event) => update('limit', event.target.value)}>
                    {[100, 250, 500, 1000, 2500].map((value) => (
                      <option key={value} value={value}>
                        {value} rows
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Date from" htmlFor="from">
                  <Input id="from" type="date" value={filters.date_from} onChange={(event) => update('date_from', event.target.value)} />
                </Field>
                <Field label="Date to" htmlFor="to">
                  <Input id="to" type="date" value={filters.date_to} onChange={(event) => update('date_to', event.target.value)} />
                </Field>
                <Field label="Category" htmlFor="category">
                  <Select
                    id="category"
                    value={filters.category_slug}
                    onChange={(event) => update('category_slug', event.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status" htmlFor="status">
                  <Select id="status" value={filters.status} onChange={(event) => update('status', event.target.value)}>
                    <option value="">Any status</option>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Freshness band" htmlFor="freshness">
                  <Select
                    id="freshness"
                    value={filters.freshness_category}
                    onChange={(event) => update('freshness_category', event.target.value)}
                  >
                    <option value="">Any band</option>
                    {freshnessOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Storage location" htmlFor="location">
                  <Input
                    id="location"
                    value={filters.storage_location}
                    onChange={(event) => update('storage_location', event.target.value)}
                    placeholder="Cold Room A"
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="3. Choose a format and generate" />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex overflow-hidden rounded-xl border border-edge">
                  {['PDF', 'XLSX'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormat(option)}
                      aria-pressed={format === option}
                      className={clsx(
                        'px-4 py-2 text-sm font-medium transition',
                        format === option ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]' : 'bg-surface-raised text-content-secondary hover:bg-surface-sunken',
                      )}
                    >
                      {option === 'PDF' ? 'PDF document' : 'Excel workbook'}
                    </button>
                  ))}
                </div>
                <Button size="lg" icon="⎙" loading={generating} onClick={generate}>
                  Generate & download
                </Button>
              </div>

              <InlineNotice tone="neutral">
                <p className="text-xs leading-relaxed">
                  PDF reports include summary metrics, charts and detail tables (capped at 300 rows for
                  readability). Excel workbooks contain one sheet per table with native charts and no row
                  cap. Both include the AI-estimate disclaimer and state which predictions came from
                  baseline rather than trained models.
                </p>
              </InlineNotice>
            </CardBody>
          </Card>
        </div>

        {/* -------------------------------------------------- history rail */}
        <div>
          <Card className="lg:sticky lg:top-20">
            <CardHeader
              title="Generated reports"
              subtitle={`${meta.total ?? 0} in total`}
              actions={
                <Button variant="ghost" size="sm" onClick={refetch}>
                  Refresh
                </Button>
              }
            />
            {loading && !data ? (
              <CardBody>
                <SkeletonTable rows={4} columns={2} />
              </CardBody>
            ) : error ? (
              <CardBody>
                <ErrorState error={error} onRetry={refetch} />
              </CardBody>
            ) : reports.length === 0 ? (
              <EmptyState
                icon="⎙"
                title="No reports yet"
                description="Generate your first report using the panel on the left."
              />
            ) : (
              <>
                <ul className="max-h-[30rem] divide-y divide-edge-subtle overflow-y-auto">
                  {reports.map((report) => (
                    <li key={report.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-content-primary">{report.title}</p>
                          <p className="mt-0.5 text-xs text-content-tertiary">
                            {formatDateTime(report.created_at)}
                          </p>
                        </div>
                        <Badge
                          className={
                            report.status === 'COMPLETED'
                              ? 'bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.22)]'
                              : report.status === 'FAILED'
                                ? 'bg-rose-50 dark:bg-rose-500/8 text-rose-700 dark:text-rose-300 ring-rose-300/60 dark:ring-rose-400/22'
                                : 'bg-surface-sunken text-content-secondary ring-edge-subtle'
                          }
                        >
                          {report.report_format}
                        </Badge>
                      </div>

                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-content-tertiary">
                        <span>{titleise(report.report_type)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatNumber(report.row_count)} rows</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatBytes(report.size_bytes)}</span>
                        {report.generation_ms && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{report.generation_ms} ms</span>
                          </>
                        )}
                      </p>

                      {report.error_message && (
                        <p className="mt-1.5 break-words text-xs text-rose-600 dark:text-rose-400">{report.error_message}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {report.status === 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={downloadingId === report.id}
                            onClick={() => download(report)}
                          >
                            Download
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 dark:text-rose-400"
                          onClick={() => setPendingDelete(report)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={pagination.page}
                  totalPages={meta.total_pages}
                  total={meta.total}
                  pageSize={pagination.pageSize}
                  onPageChange={pagination.setPage}
                />
              </>
            )}
          </Card>
        </div>
      </div>

      {generating && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center">
          <div className="flex items-center gap-3 rounded-xl border border-edge-subtle bg-surface-raised px-4 py-2.5 shadow-card-interactive">
            <Spinner size="sm" className="text-[rgb(var(--accent-ink))]" />
            <span className="text-sm text-content-secondary">Building your {format} report…</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this report?"
        description={`"${pendingDelete?.title}" and its generated file will be removed. You can always regenerate it.`}
        confirmLabel="Delete report"
      />
    </>
  );
}
