/** Application root: providers, error boundary and routes. */
import { Component } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MetaProvider } from './context/MetaContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AppRoutes from './AppRoutes';
import { Button, Card, CardBody } from './components/ui';

/**
 * Top-level error boundary.
 *
 * Catches render-time exceptions so a single bad component cannot leave the
 * user staring at a blank page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
        <Card className="max-w-lg">
          <CardBody className="p-6">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white"
              >
                ✕
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-content-primary">Something went wrong</h1>
                <p className="mt-1.5 text-sm text-content-secondary">
                  The interface hit an unexpected error. Reloading usually resolves it. If it keeps
                  happening, the browser console has the details.
                </p>
                <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-surface-sunken p-2.5 font-mono text-xs text-content-secondary">
                  {String(this.state.error?.message || this.state.error)}
                </pre>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => window.location.reload()}>Reload the page</Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      window.location.href = '/dashboard';
                    }}
                  >
                    Back to dashboard
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <ToastProvider>
            <MetaProvider>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </MetaProvider>
          </ToastProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
