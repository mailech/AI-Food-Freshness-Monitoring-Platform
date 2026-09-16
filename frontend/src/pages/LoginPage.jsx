import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/MetaContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks';
import { Button, Card, CardBody, ErrorState, Field, Input } from '../components/ui';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Development-only demo accounts created by `python -m app.seed`.
 * The Administrator account is deliberately NOT listed — admins sign in by
 * typing their credentials manually.
 */
const DEMO_ACCOUNTS = [
  { role: 'Consumer', roleKey: 'CONSUMER', email: 'consumer@freshness.example.com', icon: '🧑' },
  { role: 'Retail Manager', roleKey: 'RETAIL_MANAGER', email: 'manager@freshness.example.com', icon: '🏪' },
  { role: 'Warehouse Operator', roleKey: 'WAREHOUSE_OPERATOR', email: 'warehouse@freshness.example.com', icon: '🏭' },
  { role: 'Quality Inspector', roleKey: 'QUALITY_INSPECTOR', email: 'inspector@freshness.example.com', icon: '🔬' },
];
const DEMO_PASSWORD = 'Demo@1234';

const LOGIN_ROLES = [
  { key: 'CONSUMER', label: 'Consumer', icon: '🧑', hint: 'Personal food tracking with Google sign-in.' },
  { key: 'RETAIL_MANAGER', label: 'Retail', icon: '🏪', hint: 'Store operations sign in with email + password.' },
  { key: 'WAREHOUSE_OPERATOR', label: 'Warehouse', icon: '🏭', hint: 'Storage operations sign in with email + password.' },
  { key: 'QUALITY_INSPECTOR', label: 'Inspector', icon: '🔬', hint: 'Quality inspections sign in with email + password.' },
];

/**
 * Renders the official Google Identity Services button. On success Google hands
 * us an ID token (JWT) which we forward to the backend's /auth/google endpoint.
 * Renders nothing if no client ID is configured.
 */
function GoogleSignInButton({ onCredential, onError }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return undefined;

    let cancelled = false;
    function init() {
      if (cancelled) return;
      const google = window.google;
      if (!google?.accounts?.id) {
        // The GSI script may still be loading; retry shortly.
        window.setTimeout(init, 200);
        return;
      }
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
            else onError?.(new Error('No credential returned by Google.'));
          },
        });
        google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'continue_with',
          shape: 'pill',
        });
      } catch (err) {
        onError?.(err);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-xs text-content-tertiary">
        Google sign-in is not configured (set VITE_GOOGLE_CLIENT_ID).
      </p>
    );
  }
  return <div ref={containerRef} className="flex justify-center" />;
}

export default function LoginPage({ adminAccess = false }) {
  useDocumentTitle('Sign in');
  const { login, loginWithGoogle } = useAuth();
  const { isProduction } = useMeta();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Demo login helpers exist only for non-production (seeded) deployments.
  const showDemoHelpers = !isProduction;

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('CONSUMER');

  const redirectTo = location.state?.from || '/dashboard';

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(form.username.trim(), form.password);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}.`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  function applyDemoAccount(email) {
    setForm({ username: email, password: DEMO_PASSWORD });
    setError(null);
  }

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setError(null);
      setGoogleLoading(true);
      try {
        const user = await loginWithGoogle(credential);
        toast.success(`Welcome, ${user.full_name.split(' ')[0]}.`);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        setError(err);
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, navigate, redirectTo, toast],
  );

  const handleGoogleError = useCallback(
    (err) => {
      setError({
        message: err?.message || 'Google sign-in failed. Please try again.',
        code: 'GOOGLE_SIGN_IN_FAILED',
      });
    },
    [],
  );

  const showGoogleSection = !adminAccess && selectedRole === 'CONSUMER';
  const selectedDemoAccount = DEMO_ACCOUNTS.find((account) => account.roleKey === selectedRole);

  return (
    <Card>
      <CardBody className="p-6 sm:p-7">
        <h1 className="text-xl font-semibold text-content-primary">
          {adminAccess ? 'Administrator sign in' : 'Sign in'}
        </h1>
        <p className="mt-1 text-sm text-content-tertiary">
          {adminAccess
            ? 'Restricted access. Sign in with an administrator account to reach the admin panel.'
            : 'Access your freshness dashboard, inventory and analytics.'}
        </p>

        {adminAccess && (
          <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            ⚙ You are on the admin access page. After signing in, admin tools are available under
            {' '}<span className="font-medium">Administrator</span> in the sidebar.
          </div>
        )}

        {error && <ErrorState error={error} title="Could not sign in" className="mt-4" />}

        {!adminAccess && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
              I am signing in as
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Choose your role">
              {LOGIN_ROLES.map((role) => {
                const active = selectedRole === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedRole(role.key)}
                    className={
                      active
                        ? 'flex flex-col items-center gap-1 rounded-xl border border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.1)] px-2 py-2.5 text-sm font-medium text-content-primary transition'
                        : 'flex flex-col items-center gap-1 rounded-xl border border-edge-subtle px-2 py-2.5 text-sm text-content-tertiary transition hover:border-[rgb(var(--accent)/0.4)] hover:text-content-primary'
                    }
                  >
                    <span aria-hidden="true" className="text-lg">{role.icon}</span>
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-content-tertiary">
              {LOGIN_ROLES.find((role) => role.key === selectedRole)?.hint}
            </p>
          </div>
        )}

        {showGoogleSection && (
          <div className="mt-5">
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-edge-subtle" />
              <span className="text-xs font-medium text-content-tertiary">Consumer quick sign-in</span>
              <span className="h-px flex-1 bg-edge-subtle" />
            </div>
            <div className="mt-3">
              <GoogleSignInButton onCredential={handleGoogleCredential} onError={handleGoogleError} />
              {googleLoading && (
                <p className="mt-2 text-center text-xs text-content-tertiary" role="status">
                  Verifying your Google account…
                </p>
              )}
            </div>
          </div>
        )}

        {!showGoogleSection && !adminAccess && (
          <p className="mt-5 rounded-xl bg-surface-sunken px-3 py-2 text-center text-xs text-content-tertiary">
            Google sign-in is available for Consumer accounts. Staff roles sign in with email and
            password below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate autoComplete="off">
          <Field label="Email or username" htmlFor="username" required>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="off"
              required
              value={form.username}
              onChange={(event) => update('username', event.target.value)}
              placeholder="you@example.com"
              invalid={error?.code === 'INVALID_CREDENTIALS'}
            />
          </Field>

          <Field label="Password" htmlFor="password" required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="••••••••"
              invalid={error?.code === 'INVALID_CREDENTIALS'}
            />
          </Field>

          <Button type="submit" loading={loading} fullWidth size="lg">
            Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-content-tertiary">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-[rgb(var(--accent-ink))] dark:text-leaf-400 hover:underline">
            Create one
          </Link>
        </p>

        {showDemoHelpers && !adminAccess && selectedDemoAccount && (
          <div className="mt-6 border-t border-edge-subtle pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
              Demo login for {selectedDemoAccount.role}
            </p>
            <p className="mt-1 text-xs text-content-tertiary">
              Development-only credential created by the seeder. Password:{' '}
              <code className="rounded bg-surface-sunken px-1 font-mono">{DEMO_PASSWORD}</code>
            </p>
            <div className="mt-3 grid gap-1.5">
              <button
                key={selectedDemoAccount.email}
                type="button"
                onClick={() => applyDemoAccount(selectedDemoAccount.email)}
                className="flex items-center gap-2.5 rounded-xl border border-edge-subtle px-3 py-2 text-left text-sm transition hover:border-[rgb(var(--accent)/0.4)] hover:bg-[rgb(var(--accent)/0.07)]"
              >
                <span aria-hidden="true">{selectedDemoAccount.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-content-primary">{selectedDemoAccount.role}</span>
                  <span className="block truncate text-xs text-content-tertiary">{selectedDemoAccount.email}</span>
                </span>
                <span aria-hidden="true" className="text-xs text-content-tertiary">
                  Use →
                </span>
              </button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
