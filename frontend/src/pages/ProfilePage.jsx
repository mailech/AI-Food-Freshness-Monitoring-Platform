/** Profile: personal details, preferences and password change. */
import { useState } from 'react';
import { authApi } from '../services';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks';
import { PageHeader } from '../components/guards';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataList,
  ErrorState,
  Field,
  InlineNotice,
  Input,
  Select,
} from '../components/ui';
import { formatDateTime } from '../utils/format';

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
];

export default function ProfilePage() {
  useDocumentTitle('My profile');
  const { user, roleLabel, permissions, refreshUser, logout } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    username: user?.username || '',
    phone: user?.profile?.phone || '',
    organisation: user?.profile?.organisation || '',
    job_title: user?.profile?.job_title || '',
    default_storage_location: user?.profile?.default_storage_location || '',
    country: user?.profile?.country || '',
    timezone: user?.profile?.timezone || 'UTC',
    notify_in_app: user?.profile?.notify_in_app ?? true,
    notify_email: user?.profile?.notify_email ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await authApi.updateMe({
        full_name: form.full_name,
        username: form.username,
        profile: {
          phone: form.phone || undefined,
          organisation: form.organisation || undefined,
          job_title: form.job_title || undefined,
          default_storage_location: form.default_storage_location || undefined,
          country: form.country || undefined,
          timezone: form.timezone,
          notify_in_app: form.notify_in_app,
          notify_email: form.notify_email,
        },
      });
      await refreshUser();
      toast.success('Profile updated.');
    } catch (err) {
      setError(err);
      toast.apiError(err);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError(null);
    if (passwords.next !== passwords.confirm) {
      setPasswordError({ message: 'The new passwords do not match.', code: 'MISMATCH' });
      return;
    }
    setChangingPassword(true);
    try {
      const result = await authApi.changePassword(passwords.current, passwords.next);
      toast.success(result.message);
      setPasswords({ current: '', next: '', confirm: '' });
      // The backend revokes all sessions, so sign out cleanly.
      setTimeout(() => logout(), 1200);
    } catch (err) {
      setPasswordError(err);
      toast.apiError(err);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <>
      <PageHeader title="My profile" description="Your account details, preferences and password." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Account details" />
            <CardBody>
              {error && <ErrorState error={error} className="mb-4" />}
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="full_name" required>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(event) => update('full_name', event.target.value)}
                    />
                  </Field>
                  <Field label="Username" htmlFor="username">
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(event) => update('username', event.target.value)}
                    />
                  </Field>
                  <Field label="Phone" htmlFor="phone">
                    <Input id="phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
                  </Field>
                  <Field label="Organisation" htmlFor="organisation">
                    <Input
                      id="organisation"
                      value={form.organisation}
                      onChange={(event) => update('organisation', event.target.value)}
                    />
                  </Field>
                  <Field label="Job title" htmlFor="job_title">
                    <Input
                      id="job_title"
                      value={form.job_title}
                      onChange={(event) => update('job_title', event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Default storage location"
                    htmlFor="location"
                    hint="Pre-filled when recording readings"
                  >
                    <Input
                      id="location"
                      value={form.default_storage_location}
                      onChange={(event) => update('default_storage_location', event.target.value)}
                    />
                  </Field>
                  <Field label="Country" htmlFor="country">
                    <Input id="country" value={form.country} onChange={(event) => update('country', event.target.value)} />
                  </Field>
                  <Field label="Timezone" htmlFor="timezone">
                    <Select id="timezone" value={form.timezone} onChange={(event) => update('timezone', event.target.value)}>
                      {TIMEZONES.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <fieldset className="rounded-xl border border-edge-subtle p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                    Notification preferences
                  </legend>
                  <div className="space-y-2.5">
                    <label className="flex items-start gap-2.5 text-sm text-content-secondary">
                      <input
                        type="checkbox"
                        checked={form.notify_in_app}
                        onChange={(event) => update('notify_in_app', event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
                      />
                      <span>
                        In-app notifications
                        <span className="mt-0.5 block text-xs text-content-tertiary">
                          Freshness, shelf-life and storage alerts in the notification centre.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-sm text-content-secondary">
                      <input
                        type="checkbox"
                        checked={form.notify_email}
                        onChange={(event) => update('notify_email', event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-edge text-[rgb(var(--accent-ink))] focus:ring-[rgb(var(--accent))]"
                      />
                      <span>
                        Email notifications
                        <span className="mt-0.5 block text-xs text-content-tertiary">
                          Only delivered when the deployment has SMTP configured (EMAIL_ENABLED=true).
                        </span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Change password"
              subtitle="All active sessions are signed out after a password change"
            />
            <CardBody>
              {passwordError && <ErrorState error={passwordError} className="mb-4" />}
              <form onSubmit={changePassword} className="space-y-4">
                <Field label="Current password" htmlFor="current" required>
                  <Input
                    id="current"
                    type="password"
                    autoComplete="current-password"
                    value={passwords.current}
                    onChange={(event) => setPasswords((c) => ({ ...c, current: event.target.value }))}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New password" htmlFor="next" required hint="Min. 8 characters, a letter and a digit">
                    <Input
                      id="next"
                      type="password"
                      autoComplete="new-password"
                      value={passwords.next}
                      onChange={(event) => setPasswords((c) => ({ ...c, next: event.target.value }))}
                    />
                  </Field>
                  <Field label="Confirm new password" htmlFor="confirm" required>
                    <Input
                      id="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={passwords.confirm}
                      onChange={(event) => setPasswords((c) => ({ ...c, confirm: event.target.value }))}
                    />
                  </Field>
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  loading={changingPassword}
                  disabled={!passwords.current || !passwords.next}
                >
                  Change password
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Account" />
            <CardBody>
              <DataList
                className="sm:grid-cols-1"
                items={[
                  { label: 'Email', value: user?.email },
                  { label: 'Role', value: roleLabel },
                  { label: 'Verified', value: user?.is_verified ? 'Yes' : 'No' },
                  { label: 'Member since', value: formatDateTime(user?.created_at) },
                  { label: 'Last sign-in', value: formatDateTime(user?.last_login_at) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Your permissions"
              subtitle="Granted by your role and enforced by the backend"
            />
            <CardBody>
              <div className="flex flex-wrap gap-1.5">
                {permissions.map((permission) => (
                  <Badge key={permission} className="bg-[rgb(var(--accent)/0.07)] font-mono text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.22)]">
                    {permission}
                  </Badge>
                ))}
              </div>
              <InlineNotice tone="neutral" className="mt-3">
                <p className="text-xs">
                  The interface hides what you cannot use, but authorisation is always re-checked on the
                  server — this list is informational.
                </p>
              </InlineNotice>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
