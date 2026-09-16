/** Route guards and common page chrome. */
import { Navigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { Button, Card, EmptyState, Spinner } from './ui';

function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-sunken">
      <Spinner size="lg" className="text-[rgb(var(--accent-ink))]" />
      <p className="text-sm text-content-tertiary">{label}</p>
    </div>
  );
}

/** Requires an authenticated session. */
export function RequireAuth({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <FullPageSpinner label="Restoring your session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

/** Redirects an already-signed-in user away from login/register. */
export function RequireGuest({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  if (initialising) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

/**
 * Client-side permission gate.
 *
 * This is a UX affordance only: it prevents a user from landing on a page they
 * cannot use. The backend independently enforces the same permissions on every
 * request, so bypassing this component grants no additional access.
 */
export function RequirePermission({ permissions = [], roles = [], children }) {
  const { hasPermission, hasRole, roleLabel } = useAuth();

  const permitted =
    (permissions.length === 0 || permissions.every((p) => hasPermission(p))) &&
    (roles.length === 0 || hasRole(...roles));

  if (permitted) return children;

  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        icon="🔒"
        title="You do not have access to this area"
        description={`Your role (${roleLabel}) does not include the permission required for this page. If you believe this is wrong, ask an administrator to review your role.`}
        action={
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go back
          </Button>
        }
      />
    </Card>
  );
}

/** Standard page heading with optional actions and breadcrumb. */
export function PageHeader({ title, description, actions, breadcrumb, className, children }) {
  return (
    <header className={clsx('mb-5', className)}>
      {breadcrumb && <div className="mb-1.5 text-xs text-content-tertiary">{breadcrumb}</div>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-content-primary sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-content-tertiary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Grid wrapper used by the dashboards' summary cards. */
export function StatGrid({ children, className, columns = 4 }) {
  const columnClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  }[columns];

  return <div className={clsx('grid gap-3', columnClass, className)}>{children}</div>;
}
