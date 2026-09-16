/** Notification centre: slide-over panel with filtering and read actions. */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { notificationApi } from '../services';
import { useToast } from '../context/ToastContext';
import { formatRelative, severityMeta, titleise } from '../utils/format';
import { Button, EmptyState, ErrorState, Skeleton, Tabs } from './ui';

const TYPE_ICONS = {
  freshness_alert: '🍃',
  shelf_life_warning: '⏳',
  spoilage_alert: '⚠',
  storage_alert: '❄',
  inventory_alert: '▤',
  system_notification: 'ⓘ',
};

export default function NotificationPanel({ open, onClose, onChanged }) {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationApi.list({
        page_size: 30,
        unread_only: tab === 'unread' ? true : undefined,
      });
      setItems(data.items);
      setTotal(data.total);
      setUnread(data.unread);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  async function markRead(id) {
    try {
      await notificationApi.markRead(id);
      setItems((current) => current.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnread((value) => Math.max(0, value - 1));
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
    }
  }

  async function markAllRead() {
    try {
      const result = await notificationApi.markAllRead();
      toast.success(result.message);
      await load();
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
    }
  }

  async function remove(id) {
    try {
      await notificationApi.remove(id);
      setItems((current) => current.filter((n) => n.id !== id));
      setTotal((value) => Math.max(0, value - 1));
      onChanged?.();
    } catch (err) {
      toast.apiError(err);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-char-1000/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notification centre"
        className="relative flex h-full w-full max-w-md animate-fade-in flex-col border-l border-edge-subtle bg-surface-overlay shadow-card-interactive"
      >
        <div className="flex flex-none items-start justify-between gap-3 border-b border-edge-subtle px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-content-primary">Notifications</h2>
            <p className="mt-0.5 text-xs text-content-tertiary">
              {unread} unread of {total}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-content-tertiary hover:bg-surface-sunken"
              aria-label="Close notifications"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>

        <Tabs
          className="flex-none px-4"
          active={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread', count: unread },
          ]}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="h-9 w-9 flex-none rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState error={error} onRetry={load} />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon="🔔"
              title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description="Alerts about freshness, shelf life and storage conditions will appear here."
            />
          ) : (
            <ul className="divide-y divide-edge-subtle">
              {items.map((notification) => {
                const severity = severityMeta(notification.severity);
                return (
                  <li
                    key={notification.id}
                    className={clsx('px-4 py-3.5 transition-colors', !notification.is_read && 'bg-[rgb(var(--accent)/0.05)]')}
                  >
                    <div className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-surface-sunken text-base"
                      >
                        {TYPE_ICONS[notification.notification_type] || 'ⓘ'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-content-primary">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="h-2 w-2 flex-none rounded-full bg-[rgb(var(--accent))]" aria-label="Unread" />
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-content-secondary">{notification.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-tertiary">
                          <span className={clsx('badge', severity.badge)}>{severity.label}</span>
                          <span>{titleise(notification.notification_type)}</span>
                          <span aria-hidden="true">·</span>
                          <time>{formatRelative(notification.created_at)}</time>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          {notification.link && (
                            <Link
                              to={notification.link}
                              onClick={onClose}
                              className="font-medium text-[rgb(var(--accent-ink))] dark:text-leaf-400 hover:underline"
                            >
                              View details
                            </Link>
                          )}
                          {!notification.is_read && (
                            <button
                              type="button"
                              onClick={() => markRead(notification.id)}
                              className="text-content-secondary hover:text-content-primary hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(notification.id)}
                            className="text-content-secondary hover:text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex-none border-t border-edge-subtle bg-surface-sunken px-4 py-3">
          <Link to="/alerts" onClick={onClose} className="text-xs font-medium text-[rgb(var(--accent-ink))] dark:text-leaf-400 hover:underline">
            Open the full alert centre →
          </Link>
        </div>
      </aside>
    </div>
  );
}
