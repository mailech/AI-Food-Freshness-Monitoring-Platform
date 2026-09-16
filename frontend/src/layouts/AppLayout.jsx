/**
 * Authenticated application shell.
 *
 * Layout: glass sidebar (collapsible on desktop, slide-out drawer on mobile) +
 * sticky translucent header + animated page region.
 *
 * The sidebar is filtered by permission, but that is a UX affordance only —
 * the backend re-checks every request.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Info,
  Layers,
  LogOut,
  Menu,
  Monitor,
  Moon,
  ScanLine,
  Sun,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/MetaContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { notificationApi } from '../services';
import { playNotificationSound, playThemeSound, unlockNotificationSound } from '../utils/sound';
import { useDismiss, useLocalStorage, useMediaQuery, usePolling } from '../hooks';
import { useReducedMotion } from '../hooks/motion';
import { Badge, Button, DemoBadge } from '../components/ui';
import { visibleSections } from './navigation';
import NotificationPanel from '../components/NotificationPanel';
import ArchitectureModal from '../components/ArchitectureModal';

/* ------------------------------------------------------------------- logo */
function Logo({ collapsed }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden rounded-xl">
      <span
        aria-hidden="true"
        className="relative flex h-9 w-9 flex-none items-center justify-center rounded-xl
          text-white shadow-sm ring-1 ring-inset ring-white/20"
        style={{
          background: 'linear-gradient(140deg, rgb(var(--accent)), #0e6b46)',
        }}
      >
        <ScanLine className="h-4 w-4" />
        {/* Tiny live pulse — the product is "monitoring". */}
        <span
          className="motion-safe-only absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-mint-300
            ring-2 ring-surface-raised animate-pulse-soft"
        />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-extrabold leading-tight tracking-tight text-content-primary">
            Freshness
          </span>
          <span className="block truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-content-tertiary">
            Food Intelligence
          </span>
        </span>
      )}
    </Link>
  );
}

/* ---------------------------------------------------------------- sidebar */
function Sidebar({ sections, collapsed, onNavigate }) {
  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4" aria-label="Main navigation">
      {sections.map((section) => (
        <div key={section.label}>
          {!collapsed && <p className="eyebrow mb-2 px-3">{section.label}</p>}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.Icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'nav-link',
                        isActive && 'nav-link-active',
                        collapsed && 'justify-center px-2',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={clsx(
                            'h-[18px] w-[18px] shrink-0 transition-colors duration-micro',
                            isActive && 'text-[rgb(var(--accent-ink))]',
                          )}
                          aria-hidden="true"
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.highlight && (
                          <span
                            className="ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[rgb(var(--accent-contrast))]"
                            style={{ backgroundColor: 'rgb(var(--accent))' }}
                          >
                            AI
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ----------------------------------------------------------- theme toggle */
function ThemeToggle() {
  const { preference, cycle, theme } = useTheme();
  const Icon = preference === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  const label =
    preference === 'system'
      ? 'Theme: following your system'
      : `Theme: ${preference}`;

  return (
    <button
      type="button"
      onClick={() => {
        playThemeSound(theme === 'dark' ? 'light' : 'dark');
        cycle();
      }}
      title={`${label} — click to change`}
      aria-label={`${label}. Click to change theme.`}
      className="rounded-xl border border-edge-subtle bg-surface-raised p-2 text-content-secondary
        shadow-xs transition-all duration-micro hover:bg-surface-sunken hover:text-content-primary"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/* -------------------------------------------------------------- user menu */
function UserMenu() {
  const { user, roleLabel, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  useDismiss(containerRef, () => setOpen(false), open);

  const initials = (user?.full_name || user?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleLogout() {
    await logout();
    toast.success('Signed out.');
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl border border-edge-subtle bg-surface-raised
          py-1.5 pl-1.5 pr-2.5 text-left shadow-xs transition-all duration-micro hover:bg-surface-sunken"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold text-white"
          style={{ background: 'linear-gradient(140deg, rgb(var(--accent)), #0e6b46)' }}
        >
          {initials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[9rem] truncate text-xs font-bold text-content-primary">
            {user?.full_name}
          </span>
          <span className="block text-[10px] font-semibold text-content-tertiary">{roleLabel}</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-edge-subtle
              bg-surface-overlay shadow-float"
          >
            <div className="border-b border-edge-subtle px-4 py-3.5">
              <p className="truncate text-sm font-bold text-content-primary">{user?.full_name}</p>
              <p className="truncate text-xs text-content-tertiary">{user?.email}</p>
              <Badge className="mt-2 bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.2)]">
                {roleLabel}
              </Badge>
            </div>
            <div className="p-1.5">
              {[
                { to: '/profile', label: 'My profile', Icon: User },
                { to: '/about', label: 'About the AI models', Icon: Info },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content-secondary
                    transition-colors duration-micro hover:bg-surface-sunken hover:text-content-primary"
                >
                  <item.Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm
                  text-rose-600 transition-colors duration-micro hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ==================================================================== shell */
export default function AppLayout() {
  const { hasPermission, hasRole } = useAuth();
  const { demoMode, analysisLabel } = useMeta();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useLocalStorage('ffm.sidebar.collapsed', false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const location = useLocation();

  const sections = visibleSections({ hasPermission, hasRole });
  const { data: unread, refresh: refreshUnread } = usePolling(notificationApi.unreadCount, 45000, true);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('ffm.sound.enabled', true);
  const prevUnreadRef = useRef(null);

  // Chime when new unread notifications arrive. The first poll only captures
  // the baseline so opening the app never plays catch-up for old items.
  useEffect(() => {
    const count = unread?.unread ?? 0;
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = count;
      return;
    }
    const previous = prevUnreadRef.current;
    prevUnreadRef.current = count;
    if (!soundEnabled || count <= previous) return;
    (async () => {
      try {
        const latest = await notificationApi.list({ page_size: 1, unread_only: true });
        playNotificationSound(latest.items?.[0]?.severity);
      } catch {
        /* notification sounds are best-effort */
      }
    })();
  }, [unread, soundEnabled]);

  function toggleSound() {
    unlockNotificationSound();
    setSoundEnabled((enabled) => !enabled);
  }

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const sidebarCollapsed = isDesktop && collapsed;

  return (
    <div className="flex min-h-screen">
      {/* ------------------------------------------------- desktop sidebar */}
      <aside
        className={clsx(
          'sticky top-0 hidden h-screen flex-none border-r border-edge-subtle',
          'bg-surface-raised/70 backdrop-blur-xl lg:flex lg:flex-col',
          'transition-[width] duration-card ease-out',
          sidebarCollapsed ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        <div className="flex h-16 flex-none items-center justify-between border-b border-edge-subtle px-3">
          <Logo collapsed={sidebarCollapsed} />
        </div>
        <div className="min-h-0 flex-1">
          <Sidebar sections={sections} collapsed={sidebarCollapsed} />
        </div>
        <div className="flex-none border-t border-edge-subtle p-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs
              font-semibold text-content-tertiary transition-colors duration-micro
              hover:bg-surface-sunken hover:text-content-primary"
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* -------------------------------------------------- mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-char-1000/50 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-edge-subtle
                bg-surface-raised"
            >
              <div className="flex h-16 flex-none items-center justify-between border-b border-edge-subtle px-3">
                <Logo />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 text-content-tertiary hover:bg-surface-sunken"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <Sidebar sections={sections} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* --------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b border-edge-subtle
            bg-surface-base/80 px-4 backdrop-blur-xl sm:px-6"
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl p-2 text-content-secondary transition-colors hover:bg-surface-sunken lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="lg:hidden">
            <Logo collapsed />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setArchitectureOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-edge-subtle bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-content-secondary shadow-xs transition hover:bg-surface-sunken hover:text-content-primary"
              title="System Architecture Diagram (PDF Page 2)"
            >
              <Layers className="h-3.5 w-3.5 text-[rgb(var(--accent-ink))]" />
              <span className="hidden xl:inline">Architecture</span>
            </button>

            {demoMode && (
              <DemoBadge
                label={analysisLabel}
                className="hidden 2xl:inline-flex"
                title="This deployment runs in DEMO_MODE: freshness, spoilage and shelf-life outputs come from transparent baseline models, not trained neural networks."
              />
            )}

            <Link to="/analyze" className="hidden sm:block">
              <Button size="sm" icon={<ScanLine />}>
                Analyse Food
              </Button>
            </Link>

            <ThemeToggle />

            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Notification sounds on — click to mute' : 'Notification sounds muted — click to unmute'}
              aria-label={soundEnabled ? 'Mute notification sounds' : 'Unmute notification sounds'}
              className="rounded-xl border border-edge-subtle bg-surface-raised p-2 text-content-secondary
                shadow-xs transition-all duration-micro hover:bg-surface-sunken hover:text-content-primary"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative rounded-xl border border-edge-subtle bg-surface-raised p-2
                text-content-secondary shadow-xs transition-all duration-micro
                hover:bg-surface-sunken hover:text-content-primary"
              aria-label={`Notifications${unread?.unread ? `, ${unread.unread} unread` : ''}`}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unread?.unread > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center
                    rounded-full px-1 text-[10px] font-extrabold text-white ring-2 ring-surface-base"
                  style={{ backgroundColor: '#e3554c' }}
                >
                  {unread.unread > 99 ? '99+' : unread.unread}
                </span>
              )}
            </button>

            <UserMenu />
          </div>
        </header>

        {demoMode && (
          <div
            className="border-b border-amber-300/50 bg-amber-50/70 px-4 py-2 text-center text-xs
              font-medium text-amber-900 xl:hidden dark:border-amber-400/20 dark:bg-amber-500/8 dark:text-amber-200"
          >
            {analysisLabel} — baseline models, no accuracy claimed
          </div>
        )}

        {/* Page region: fades/slides between routes without remounting the shell. */}
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="flex-none border-t border-edge-subtle px-4 py-3.5 text-center text-xs text-content-tertiary sm:px-6">
          Freshness and shelf-life figures are AI estimates, not laboratory measurements. Confirm by
          physical inspection before making food-safety decisions.
        </footer>
      </div>

      <NotificationPanel
        open={notificationsOpen}
        onClose={() => {
          setNotificationsOpen(false);
          refreshUnread();
        }}
        onChanged={refreshUnread}
      />

      <ArchitectureModal
        open={architectureOpen}
        onClose={() => setArchitectureOpen(false)}
      />
    </div>
  );
}
