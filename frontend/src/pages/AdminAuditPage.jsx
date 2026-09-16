/** Admin: audit trail viewer. */
import { useState } from 'react';
import clsx from 'clsx';
import { adminApi } from '../services';
import { useAsync, useDocumentTitle, usePagination } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  InlineNotice,
  Input,
  Modal,
  Pagination,
  Select,
  SkeletonTable,
} from '../components/ui';
import { formatDateTime, titleise } from '../utils/format';

const ACTION_TONES = {
  LOGIN: 'bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.22)]',
  LOGIN_FAILED: 'bg-rose-100/70 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-300/70 dark:ring-rose-400/25',
  LOGOUT: 'bg-surface-sunken text-content-secondary ring-edge-subtle',
  REGISTER: 'bg-chill-50 dark:bg-chill-500/8 text-chill-700 dark:text-chill-300 ring-chill-300/60 dark:ring-chill-400/22',
  CREATE: 'bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.22)]',
  UPDATE: 'bg-chill-50 dark:bg-chill-500/8 text-chill-700 dark:text-chill-300 ring-chill-300/60 dark:ring-chill-400/22',
  DELETE: 'bg-rose-50 dark:bg-rose-500/8 text-rose-700 dark:text-rose-300 ring-rose-300/60 dark:ring-rose-400/22',
  IMAGE_UPLOAD: 'bg-surface-sunken text-content-secondary ring-edge-subtle',
  IMAGE_ANALYSIS: 'bg-amber-50 dark:bg-amber-500/8 text-amber-700 dark:text-amber-300 ring-amber-300/60 dark:ring-amber-400/22',
  REPORT_GENERATE: 'bg-chill-50 dark:bg-chill-500/8 text-chill-700 dark:text-chill-300 ring-chill-300/60 dark:ring-chill-400/22',
  ADMIN_CHANGE: 'bg-amber-100/70 dark:bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-300/70 dark:ring-amber-400/25',
  STORAGE_READING: 'bg-surface-sunken text-content-secondary ring-edge-subtle',
  TOKEN_REFRESH: 'bg-surface-sunken text-content-secondary ring-edge-subtle',
};

export default function AdminAuditPage() {
  useDocumentTitle('Audit log');
  const pagination = usePagination(25);

  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState(null);

  const { data: actions } = useAsync(adminApi.auditActions, []);
  const { data, loading, error, refetch } = useAsync(
    () =>
      adminApi.auditLogs({
        action: action || undefined,
        entity_type: entityType || undefined,
        user_id: userId || undefined,
        page: pagination.page,
        page_size: pagination.pageSize,
      }),
    [action, entityType, userId, pagination.page, pagination.pageSize],
  );

  const entries = data?.items || [];
  const meta = data?.meta || {};

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of logins, data changes, image analyses, report generation and administrative actions."
      />

      <div className="space-y-4">
        <InlineNotice tone="neutral" title="What is recorded">
          Every entry captures the actor, action, affected entity, request path, IP address and
          correlation id. Credential-like values are redacted before persistence — passwords, tokens
          and secrets never reach this log.
        </InlineNotice>

        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Action" htmlFor="action">
                <Select
                  id="action"
                  value={action}
                  onChange={(event) => {
                    setAction(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All actions</option>
                  {(actions || []).map((item) => (
                    <option key={item} value={item}>
                      {titleise(item)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Entity type" htmlFor="entity">
                <Select
                  id="entity"
                  value={entityType}
                  onChange={(event) => {
                    setEntityType(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All entities</option>
                  {[
                    'user',
                    'food_product',
                    'food_batch',
                    'inventory_item',
                    'food_image',
                    'freshness_assessment',
                    'storage_reading',
                    'report',
                  ].map((item) => (
                    <option key={item} value={item}>
                      {titleise(item)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="User ID" htmlFor="user" hint="Filter to one actor">
                <Input
                  id="user"
                  type="number"
                  min="1"
                  value={userId}
                  onChange={(event) => {
                    setUserId(event.target.value);
                    pagination.setPage(1);
                  }}
                  placeholder="e.g. 3"
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        {loading && !data ? (
          <SkeletonTable rows={12} columns={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : entries.length === 0 ? (
          <Card>
            <EmptyState icon="❐" title="No audit entries match these filters" />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader title={`${meta.total} entr${meta.total === 1 ? 'y' : 'ies'}`} />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Entity</th>
                    <th>Description</th>
                    <th>Request</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className={clsx(!entry.success && 'bg-rose-50 dark:bg-rose-500/8/40')}>
                      <td className="whitespace-nowrap text-xs text-content-tertiary">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td>
                        <Badge className={ACTION_TONES[entry.action] || 'bg-surface-sunken text-content-secondary ring-edge-subtle'}>
                          {titleise(entry.action)}
                        </Badge>
                        {!entry.success && (
                          <span className="ml-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">failed</span>
                        )}
                      </td>
                      <td className="text-xs">
                        <span className="block truncate text-content-primary">{entry.actor_email || 'anonymous'}</span>
                        {entry.actor_role && (
                          <span className="block text-content-tertiary">{titleise(entry.actor_role)}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs text-content-secondary">
                        {entry.entity_type ? `${titleise(entry.entity_type)} #${entry.entity_id}` : '—'}
                      </td>
                      <td className="max-w-sm text-content-secondary">{entry.description || '—'}</td>
                      <td className="font-mono text-xs text-content-tertiary">
                        {entry.method ? `${entry.method} ${entry.path || ''}` : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelected(entry)}
                          className="text-xs font-medium text-[rgb(var(--accent-ink))] dark:text-leaf-400 hover:underline"
                        >
                          Details
                        </button>
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

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? titleise(selected.action) : ''}
        description={selected?.description}
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {[
                ['Entry ID', selected.id],
                ['When', formatDateTime(selected.created_at)],
                ['Actor', selected.actor_email || 'anonymous'],
                ['Actor role', titleise(selected.actor_role)],
                ['User ID', selected.user_id ?? '—'],
                ['Entity', selected.entity_type ? `${selected.entity_type} #${selected.entity_id}` : '—'],
                ['Method', selected.method || '—'],
                ['Path', selected.path || '—'],
                ['Status code', selected.status_code ?? '—'],
                ['IP address', selected.ip_address || '—'],
                ['Request ID', selected.request_id || '—'],
                ['Success', String(selected.success)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-content-tertiary">{label}</dt>
                  <dd className="mt-0.5 break-words font-mono text-xs text-content-primary">{String(value)}</dd>
                </div>
              ))}
            </dl>

            {selected.metadata_json && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">Metadata</p>
                <pre className="mt-1.5 overflow-x-auto rounded-xl bg-char-900 p-3 text-xs text-content-inverted">
                  {JSON.stringify(selected.metadata_json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
