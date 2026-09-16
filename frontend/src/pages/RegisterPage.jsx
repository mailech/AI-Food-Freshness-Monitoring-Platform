import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks';
import { Button, Card, CardBody, ErrorState, Field, Input, Select } from '../components/ui';

/** Roles a user may pick during self-service registration (ADMIN is excluded). */
const SELECTABLE_ROLES = [
  {
    value: 'CONSUMER',
    label: 'Consumer',
    description: 'Track your own food, analyse photos, get storage and consumption advice.',
  },
  {
    value: 'RETAIL_MANAGER',
    label: 'Retail Manager',
    description: 'Manage products, batches, quality analytics and reports.',
  },
  {
    value: 'WAREHOUSE_OPERATOR',
    label: 'Warehouse Operator',
    description: 'Monitor storage environments and compliance across batches.',
  },
  {
    value: 'QUALITY_INSPECTOR',
    label: 'Quality Inspector',
    description: 'Inspect batches, review spoilage indicators and quality scores.',
  },
];

export default function RegisterPage() {
  useDocumentTitle('Create an account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'CONSUMER',
    organisation: '',
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const errors = {};
    if (form.full_name.trim().length < 2) errors.full_name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
    if (form.password.length < 8) errors.password = 'At least 8 characters.';
    else if (!/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password))
      errors.password = 'Must contain at least one letter and one digit.';
    if (form.password !== form.confirm) errors.confirm = 'Passwords do not match.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        organisation: form.organisation.trim() || undefined,
      });
      toast.success(`Account created. Welcome, ${user.full_name.split(' ')[0]}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err);
      if (err.fields) {
        setFieldErrors(
          Object.fromEntries(err.fields.map((f) => [f.field.split('.').pop(), f.message])),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = SELECTABLE_ROLES.find((role) => role.value === form.role);

  return (
    <Card>
      <CardBody className="p-6 sm:p-7">
        <h1 className="text-xl font-semibold text-content-primary">Create your account</h1>
        <p className="mt-1 text-sm text-content-tertiary">
          Choose the role that matches how you will use the platform.
        </p>

        {error && !error.fields && (
          <ErrorState error={error} title="Registration failed" className="mt-4" />
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <Field label="Full name" htmlFor="full_name" required error={fieldErrors.full_name}>
            <Input
              id="full_name"
              autoComplete="name"
              value={form.full_name}
              onChange={(event) => update('full_name', event.target.value)}
              placeholder="Asha Menon"
              invalid={Boolean(fieldErrors.full_name)}
            />
          </Field>

          <Field label="Email address" htmlFor="email" required error={fieldErrors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder="you@example.com"
              invalid={Boolean(fieldErrors.email)}
            />
          </Field>

          <Field label="Role" htmlFor="role" hint={selectedRole?.description}>
            <Select id="role" value={form.role} onChange={(event) => update('role', event.target.value)}>
              {SELECTABLE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>

          {form.role !== 'CONSUMER' && (
            <Field label="Organisation" htmlFor="organisation" hint="Optional">
              <Input
                id="organisation"
                value={form.organisation}
                onChange={(event) => update('organisation', event.target.value)}
                placeholder="FreshMart Retail"
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Password"
              htmlFor="password"
              required
              error={fieldErrors.password}
              hint={!fieldErrors.password ? 'Min. 8 characters, with a letter and a digit.' : undefined}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                invalid={Boolean(fieldErrors.password)}
              />
            </Field>

            <Field label="Confirm password" htmlFor="confirm" required error={fieldErrors.confirm}>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(event) => update('confirm', event.target.value)}
                invalid={Boolean(fieldErrors.confirm)}
              />
            </Field>
          </div>

          <Button type="submit" loading={loading} fullWidth size="lg">
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-content-tertiary">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-[rgb(var(--accent-ink))] dark:text-leaf-400 hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-content-tertiary">
          Administrator accounts can only be created by an existing administrator.
        </p>
      </CardBody>
    </Card>
  );
}
