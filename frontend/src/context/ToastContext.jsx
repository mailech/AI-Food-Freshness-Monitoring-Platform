/** Toast notifications with an accessible live region. */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

const ToastContext = createContext(null);

const TONES = {
  success: {
    icon: '✓',
    className: 'border-[rgb(var(--accent)/0.4)] bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] dark:text-leaf-200',
    iconClass: 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]',
  },
  error: {
    icon: '✕',
    className: 'border-rose-300/70 dark:border-rose-400/25 bg-rose-50 dark:bg-rose-500/8 text-rose-800 dark:text-rose-200',
    iconClass: 'bg-rose-600 text-white',
  },
  warning: {
    icon: '!',
    className: 'border-amber-300/60 dark:border-amber-400/25 bg-amber-50 dark:bg-amber-500/8 text-amber-800 dark:text-amber-200',
    iconClass: 'bg-amber-500 text-char-900',
  },
  info: {
    icon: 'i',
    className: 'border-chill-300 bg-chill-50 dark:bg-chill-500/8 text-chill-700 dark:text-chill-300 dark:text-chill-200 dark:text-chill-100',
    iconClass: 'bg-chill-600 text-white',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, { tone = 'info', title, duration = 5000 } = {}) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current, { id, message, tone, title }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, options) => push(message, { ...options, tone: 'success' }),
      error: (message, options) => push(message, { ...options, tone: 'error', duration: 8000 }),
      warning: (message, options) => push(message, { ...options, tone: 'warning', duration: 7000 }),
      info: (message, options) => push(message, { ...options, tone: 'info' }),
      /** Convenience for ApiError objects. */
      apiError: (err, fallback = 'Something went wrong.') =>
        push(err?.message || fallback, {
          tone: 'error',
          title: err?.code && err.code !== 'UNKNOWN_ERROR' ? err.code.replace(/_/g, ' ') : undefined,
          duration: 8000,
        }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {toasts.map((t) => (
            <span key={t.id}>{`${t.title ? `${t.title}: ` : ''}${t.message}`}</span>
          ))}
        </div>
        {toasts.map((toast) => {
          const tone = TONES[toast.tone] || TONES.info;
          return (
            <div
              key={toast.id}
              className={clsx(
                'pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl border p-3 shadow-card-interactive',
                tone.className,
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold',
                  tone.iconClass,
                )}
              >
                {tone.icon}
              </span>
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-xs font-semibold uppercase tracking-wide">{toast.title}</p>}
                <p className="break-words text-sm">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-current/70 transition hover:bg-black/5"
                aria-label="Dismiss notification"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}
