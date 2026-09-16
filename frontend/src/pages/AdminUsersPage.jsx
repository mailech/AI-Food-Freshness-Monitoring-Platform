/** Admin: user management. */
import { useState } from 'react';
import { adminApi } from '../services';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsync, useDebounced, useDocumentTitle, usePagination } from '../hooks';
import { PageHeader, StatGrid } from '../components/guards';
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
  Modal,
  Pagination,
  Select,
  SkeletonTable,
  Stat,
} from '../components/ui';
import { formatDateTime, formatNumber, formatRelative } from '../utils/format';

const ROLES = ['CONSUMER', 'RETAIL_MANAGER', 'WAREHOUSE_OPERATOR', 'QUALITY_INSPECTOR', 'ADMIN'];

function UserModal({ open, onClose, user, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(user);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [seeded, setSeeded] = useState(null);

  if (open && seeded !== (user?.id ?? 'new')) {
    setSeeded(user?.id ?? 'new');
    setForm(
      user
        ? {
            full_name: user.full_name,
            username: user.username,
            role: user.role?.name,
            is_active: user.is_active,
            is_verified: user.is_verified,
            organisation: user.profile?.organisation || '',
          }
        : {
            full_name: '',
            email: '',
            password: '',
            username: '',
            role: 'CONSUMER',
            organisation: '',
            is_active: true,
            is_verified: true,
          },
    );
    setError(null);
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await adminApi.updateUser(user.id, {
          full_name: form.full_name,
          username: form.username,
          role: form.role,
          is_active: form.is_active,
          is_verified: form.is_verified,
          profile: { organisation: form.organisation || undefined },
        });
        toast.success('User updated.');
      } else {
        await adminApi.createUser({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          username: form.username || undefined,
          role: form.role,
          organisation: form.organisation || undefined,
          is_active: form.is_active,
          is_verified: form.is_verified,
        });
        toast.success('User created.');
      }
      setSeeded(null);
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setSeeded(null);
        onClose();
      }}
      title={isEdit ? `Edit ${user.full_name}` : 'Create a user'}
      description={isEdit ? user.email : 'Administrators may create any role, including other administrators.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      {error && <ErrorState error={error} className="mb-4" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="u-name" required className="sm:col-span-2">
          <Input id="u-name" value={form.full_name || ''} onChange={(event) => update('full_name', event.target.value)} />
        </Field>
        {!isEdit && (
          <>
            <Field label="Email" htmlFor="u-email" required>
              <Input id="u-email" type="email" value={form.email || ''} onChange={(event) => update('email', event.target.value)} />
            </Field>
            <Field label="Password" htmlFor="u-pass" required hint="Min. 8 characters, a letter and a digit">
              <Input
                id="u-pass"
                type="password"
                value={form.password || ''}
                onChange={(event) => update('password', event.target.value)}
              />
            </Field>
          </>
        )}
        <Field label="Username" htmlFor="u-username" hint={isEdit ? undefined : 'Derived from the email if blank'}>
          <Input id="u-username" value={form.username || ''} onChange={(event) => update('username', event.target.value)} />
        </Field>
        <Field label="Role" htmlFor="u-role" required>
          <Select id="u-role" value={form.role || 'CONSUMER'} onChange={(event) => update('role', event.target.value)}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Organisation" htmlFor="u-org">
          <Input id="u-org" value={form.organisation || ''} onChange={(event) => update('organisation', event.target.value)} />
        </Field>
        <div className="flex items-end gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-content-secondary">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(event) => update('is_active', event.target.checked)}
              className="h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-content-secondary">
            <input
              type="checkbox"
              checked={Boolean(form.is_verified)}
              onChange={(event) => update('is_verified', event.target.checked)}
              className="h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
            />
            Verified
          </label>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminUsersPage() {
  useDocumentTitle('User management');
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const pagination = usePagination(20);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDeactivate, setPendingDeactivate] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const debouncedSearch = useDebounced(search, 350);

  const { data, loading, error, refetch } = useAsync(
    () =>
      adminApi.users({
        q: debouncedSearch || undefined,
        role: role || undefined,
        is_active: activeFilter === '' ? undefined : activeFilter === 'true',
        page: pagination.page,
        page_size: pagination.pageSize,
      }),
    [debouncedSearch, role, activeFilter, pagination.page, pagination.pageSize],
  );
  const { data: roles } = useAsync(adminApi.roles, []);

  const users = data?.items || [];
  const meta = data?.meta || {};

  async function deactivate() {
    if (!pendingDeactivate) return;
    setBusy(true);
    try {
      const result = await adminApi.deactivateUser(pendingDeactivate.id);
      toast.success(result.message);
      setPendingDeactivate(null);
      refetch();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!resetting) return;
    setBusy(true);
    try {
      const result = await adminApi.resetPassword(resetting.id, newPassword);
      toast.success(result.message);
      setResetting(null);
      setNewPassword('');
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="User management"
        description="Create users, change roles, reset passwords and deactivate accounts."
        actions={
          <Button
            size="sm"
            icon="＋"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            New user
          </Button>
        }
      />

      <div className="space-y-4">
        <StatGrid columns={5}>
          {(roles || []).map((item) => (
            <Stat
              key={item.name}
              label={item.display_name}
              value={formatNumber(item.user_count)}
              sublabel={`${item.permissions.length} permissions`}
              icon="☰"
            />
          ))}
        </StatGrid>

        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Search" htmlFor="search">
                <Input
                  id="search"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    pagination.setPage(1);
                  }}
                  placeholder="Name, email or username"
                />
              </Field>
              <Field label="Role" htmlFor="role">
                <Select
                  id="role"
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All roles</option>
                  {ROLES.map((item) => (
                    <option key={item} value={item}>
                      {ROLE_LABELS[item]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" htmlFor="active">
                <Select
                  id="active"
                  value={activeFilter}
                  onChange={(event) => {
                    setActiveFilter(event.target.value);
                    pagination.setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="true">Active only</option>
                  <option value="false">Deactivated only</option>
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        {loading && !data ? (
          <SkeletonTable rows={8} columns={6} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : users.length === 0 ? (
          <Card>
            <EmptyState icon="☰" title="No users match these filters" />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader title={`${meta.total} user${meta.total === 1 ? '' : 's'}`} />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className={item.is_active ? undefined : 'opacity-60'}>
                      <td>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-content-primary">
                            {item.full_name}
                            {item.id === currentUser?.id && (
                              <span className="ml-1.5 text-xs font-normal text-content-tertiary">(you)</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-content-tertiary">{item.email}</p>
                        </div>
                      </td>
                      <td>
                        <Badge className="bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.22)]">
                          {item.role?.display_name}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            className={
                              item.is_active
                                ? 'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]'
                                : 'bg-surface-sunken text-content-secondary ring-edge'
                            }
                          >
                            {item.is_active ? 'Active' : 'Deactivated'}
                          </Badge>
                          {item.is_verified && (
                            <Badge className="bg-chill-50 dark:bg-chill-500/8 text-chill-700 dark:text-chill-300 ring-chill-300/60 dark:ring-chill-400/22">Verified</Badge>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-xs text-content-tertiary">
                        {item.last_login_at ? formatRelative(item.last_login_at) : 'Never'}
                      </td>
                      <td className="whitespace-nowrap text-xs text-content-tertiary">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td>
                        <div className="flex flex-nowrap gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(item);
                              setModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setResetting(item)}>
                            Password
                          </Button>
                          {item.is_active && item.id !== currentUser?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-600 dark:text-rose-400"
                              onClick={() => setPendingDeactivate(item)}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
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

        {/* -------------------------------------------- role/permission matrix */}
        <Card>
          <CardHeader
            title="Role permission matrix"
            subtitle="The authoritative grant table enforced by the backend"
          />
          <CardBody>
            <div className="grid gap-3 lg:grid-cols-2">
              {(roles || []).map((item) => (
                <div key={item.name} className="rounded-xl border border-edge-subtle p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-content-primary">{item.display_name}</p>
                      <p className="mt-0.5 text-xs text-content-tertiary">{item.description}</p>
                    </div>
                    <Badge className="bg-surface-sunken text-content-secondary ring-edge-subtle">
                      {item.user_count} user{item.user_count === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.permissions.map((permission) => (
                      <Badge key={permission} className="bg-[rgb(var(--accent)/0.07)] font-mono text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.22)]">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <InlineNotice tone="neutral" className="mt-4">
              <p className="text-xs">
                The frontend mirrors this table only to hide unusable UI. Every sensitive endpoint
                re-checks the permission server-side, so a modified client gains no extra access.
              </p>
            </InlineNotice>
          </CardBody>
        </Card>
      </div>

      <UserModal open={modalOpen} user={editing} onClose={() => setModalOpen(false)} onSaved={refetch} />

      <ConfirmDialog
        open={Boolean(pendingDeactivate)}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={deactivate}
        loading={busy}
        title="Deactivate this account?"
        description={`${pendingDeactivate?.full_name} will be unable to sign in and all of their sessions will be revoked. Their data is preserved.`}
        confirmLabel="Deactivate"
      />

      <Modal
        open={Boolean(resetting)}
        onClose={() => {
          setResetting(null);
          setNewPassword('');
        }}
        title="Reset password"
        description={`Set a new password for ${resetting?.email}. All of their sessions will be revoked.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={resetPassword} loading={busy} disabled={newPassword.length < 8}>
              Reset password
            </Button>
          </>
        }
      >
        <Field label="New password" htmlFor="reset-pass" required hint="Min. 8 characters, a letter and a digit">
          <Input
            id="reset-pass"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}
