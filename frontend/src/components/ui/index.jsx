/**
 * Design system primitives.
 *
 * Every component here is presentational and accessible by default: real
 * buttons/links, status conveyed by icon + text as well as colour, and
 * loading / empty / error states as first-class components.
 *
 * Public API is deliberately backwards compatible with the previous version —
 * pages keep passing the same props (including plain-glyph `icon` strings) — so
 * the visual upgrade required no changes to page logic.
 */
import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Info,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  complianceMeta,
  priorityMeta,
  riskMeta,
  scoreColor,
  severityMeta,
  statusMeta,
} from '../../utils/format';
import { useCountUp, useReducedMotion, useTilt } from '../../hooks/motion';

/* ==========================================================================
   BUTTON
   ========================================================================== */
const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  glass: 'btn-glass',
  danger: 'btn-danger',
  warning: 'btn-warning',
};
const BUTTON_SIZES = { xs: 'btn-xs', sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' };

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className,
    type = 'button',
    icon,
    iconRight,
    fullWidth = false,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'btn',
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
        BUTTON_SIZES[size] || BUTTON_SIZES.md,
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : icon ? (
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
          {iconRight}
        </span>
      )}
    </button>
  );
});

export function Spinner({ size = 'md', className }) {
  const dimensions = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-8 w-8' };
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={clsx('animate-spin', dimensions[size] || dimensions.md, className)}
    />
  );
}

/* ==========================================================================
   SURFACES
   ========================================================================== */
export function Card({ children, className, as: Tag = 'section', hover = false, ...rest }) {
  return (
    <Tag
      className={clsx('surface-card edge-lit', hover && 'card-interactive', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Frosted panel for overlays and hero areas. Blur stays modest for legibility. */
export function GlassCard({ children, className, as: Tag = 'div', hover = false, ...rest }) {
  return (
    <Tag className={clsx('glass edge-lit', hover && 'card-interactive', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, actions, className, children, icon }) {
  return (
    <div className={clsx('card-header', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
              bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent-ink))] [&>svg]:h-4 [&>svg]:w-4"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className }) {
  return <div className={clsx('card-body', className)}>{children}</div>;
}

/** Page/section heading with an eyebrow label. */
export function SectionHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={clsx('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-subtitle max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Wrapper adding a capped mouse-follow perspective (max 4deg).
 * Automatically inert for reduced-motion and touch devices.
 */
export function Tilt3D({ children, className, max = 4, disabled = false, ...rest }) {
  const tilt = useTilt({ max, enabled: !disabled });
  return (
    <div
      ref={tilt.ref}
      {...tilt.handlers}
      className={clsx(tilt.enabled && 'tilt-3d preserve-3d', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   BADGES
   ========================================================================== */
export function Badge({ children, className, icon, title, ...rest }) {
  return (
    <span className={clsx('badge', className)} title={title} {...rest}>
      {icon && (
        <span aria-hidden="true" className="shrink-0 [&>svg]:h-3 [&>svg]:w-3">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * Freshness / inventory status pill.
 * Colour is never the only signal: there is always a glyph and a text label.
 */
export function StatusBadge({ status, className, showIcon = true, size = 'md' }) {
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  return (
    <span
      className={clsx('badge', meta.badge, size === 'sm' && 'px-2 py-0.5 text-[10px]', className)}
      title={meta.description}
    >
      {showIcon && Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {meta.label}
    </span>
  );
}

export function SeverityBadge({ severity, className }) {
  const meta = severityMeta(severity);
  const Icon = meta.Icon;
  return (
    <span className={clsx('badge', meta.badge, className)}>
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {meta.label}
    </span>
  );
}

export function RiskBadge({ risk, className }) {
  const meta = riskMeta(risk);
  return <span className={clsx('badge', meta.badge, className)}>{meta.label}</span>;
}

export function ComplianceBadge({ status, className }) {
  const meta = complianceMeta(status);
  const Icon = meta.Icon;
  return (
    <span className={clsx('badge', meta.badge, className)}>
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }) {
  const meta = priorityMeta(priority);
  return <span className={clsx('badge', meta.badge, className)}>{meta.label}</span>;
}

/** Marks AI output as a demo/baseline estimate. Deliberately hard to miss. */
export function DemoBadge({ label = 'Demo AI Analysis', className, title }) {
  return (
    <span
      className={clsx(
        'badge bg-amber-100/80 text-amber-800 ring-amber-300/70',
        'dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-400/25',
        className,
      )}
      title={
        title ||
        'Produced by a transparent baseline model, not a trained neural network. No accuracy is claimed.'
      }
    >
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Small "AI" marker used beside model-derived values. */
export function AIBadge({ className, children = 'AI', title }) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent-ink))] ring-1 ring-inset ring-[rgb(var(--accent)/0.22)]',
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Square icon plate — the consistent way icons sit on surfaces. */
export function IconPlate({ children, tone = 'accent', size = 'md', className }) {
  const tones = {
    accent: 'bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.18)]',
    neutral: 'bg-surface-sunken text-content-secondary ring-edge-subtle',
    positive: 'bg-[rgb(var(--accent)/0.12)]/70 text-[rgb(var(--accent-ink))] dark:text-leaf-400 ring-[rgb(var(--accent)/0.3)]/60 dark:bg-[rgb(var(--accent)/0.07)]0/12 dark:text-leaf-300 dark:ring-leaf-400/20',
    warning: 'bg-amber-100/70 text-amber-700 ring-amber-300/60 dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-400/20',
    danger: 'bg-rose-100/70 text-rose-700 ring-rose-300/60 dark:bg-rose-500/12 dark:text-rose-200 dark:ring-rose-400/20',
    info: 'bg-chill-100/70 text-chill-700 dark:text-chill-300 ring-chill-300/60 dark:bg-chill-50 dark:bg-chill-500/80/12 dark:text-chill-200 dark:ring-chill-400/20',
  };
  const sizes = {
    sm: 'h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5',
    md: 'h-9 w-9 rounded-xl [&>svg]:h-4 [&>svg]:w-4',
    lg: 'h-11 w-11 rounded-2xl [&>svg]:h-5 [&>svg]:w-5',
  };
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center ring-1 ring-inset',
        tones[tone] || tones.accent,
        sizes[size] || sizes.md,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ==========================================================================
   NUMBERS AND MICRO-VISUALISATION
   ========================================================================== */
/** Number that counts up on mount. Static when motion is reduced. */
export function AnimatedNumber({ value, decimals = 0, suffix = '', prefix = '', className }) {
  const display = useCountUp(value, { decimals });
  if (value === null || value === undefined) {
    return <span className={className}>—</span>;
  }
  return (
    <span className={clsx('tabular-nums', className)}>
      {prefix}
      {decimals > 0 ? display.toFixed(decimals) : display.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Tiny inline trend line. Pure SVG — no chart library, no layout cost. */
export function Sparkline({
  values = [],
  className,
  width = 88,
  height = 26,
  color,
  fill = true,
}) {
  const clean = values.filter((v) => v !== null && v !== undefined && Number.isFinite(Number(v)));
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const step = width / (clean.length - 1);
  const points = clean.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return [x, y];
  });

  // Smooth the polyline with quadratic midpoints; avoids spiky micro-charts.
  let path = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i += 1) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    path += ` Q ${px + (cx - px) / 2},${py} ${px + (cx - px) / 2},${(py + cy) / 2}`;
    path += ` Q ${px + (cx - px) / 2},${cy} ${cx},${cy}`;
  }
  const stroke = color || 'rgb(var(--accent))';
  const gradientId = `spark-${Math.abs(clean[0] * 1000 + clean.length)}`;

  return (
    <svg
      className={clsx('overflow-visible', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L ${width},${height} L 0,${height} Z`} fill={`url(#${gradientId})`} />
        </>
      )}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" fill={stroke} />
    </svg>
  );
}

/* ==========================================================================
   STAT CARDS
   ========================================================================== */
const STAT_TONES = {
  neutral: { value: 'text-content-primary', plate: 'neutral' },
  positive: { value: 'text-[rgb(var(--accent-ink))] dark:text-leaf-400 dark:text-leaf-300', plate: 'positive' },
  warning: { value: 'text-amber-700 dark:text-amber-300', plate: 'warning' },
  danger: { value: 'text-rose-700 dark:text-rose-300', plate: 'danger' },
  info: { value: 'text-chill-700 dark:text-chill-300 dark:text-chill-300', plate: 'info' },
};

/**
 * Premium statistic card: animated value, optional trend, optional sparkline,
 * icon plate, hover lift. Backwards compatible with the old `Stat` signature.
 */
export function StatCard({
  label,
  value,
  sublabel,
  tone = 'neutral',
  icon,
  trend,
  spark,
  className,
  href: _href,
  progress,
}) {
  const toneMeta = STAT_TONES[tone] || STAT_TONES.neutral;
  const numeric = typeof value === 'number' ? value : null;

  return (
    <Card hover className={clsx('group relative overflow-hidden p-4 sm:p-5', className)}>
      {/* Accent bloom that only appears on hover — depth without noise. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full
          bg-[rgb(var(--accent)/0.09)] opacity-0 blur-2xl transition-opacity duration-card
          group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && (
          <IconPlate tone={toneMeta.plate} size="sm" className="transition-transform duration-card group-hover:scale-105">
            {icon}
          </IconPlate>
        )}
      </div>

      <div className="relative mt-2.5 flex items-end justify-between gap-3">
        <p className={clsx('metric text-2xl sm:text-3xl', toneMeta.value)}>
          {numeric !== null ? <AnimatedNumber value={numeric} /> : (value ?? '—')}
        </p>
        {spark?.length > 1 && <Sparkline values={spark} className="mb-1 opacity-80" />}
      </div>

      {progress !== undefined && progress !== null && (
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full transition-[width] duration-scene ease-out"
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              backgroundColor: 'rgb(var(--accent))',
            }}
          />
        </div>
      )}

      {(sublabel || trend) && (
        <div className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {trend && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-bold',
                trend.direction === 'up' && 'bg-[rgb(var(--accent)/0.12)]/80 text-[rgb(var(--accent-ink))] dark:text-leaf-400 dark:bg-[rgb(var(--accent)/0.07)]0/12 dark:text-leaf-300',
                trend.direction === 'down' && 'bg-rose-100/80 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300',
                (!trend.direction || trend.direction === 'flat') &&
                  'bg-surface-sunken text-content-secondary',
              )}
            >
              <span aria-hidden="true">
                {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '■'}
              </span>
              {trend.label}
            </span>
          )}
          {sublabel && <p className="text-xs leading-snug text-content-tertiary">{sublabel}</p>}
        </div>
      )}
    </Card>
  );
}

/** Backwards-compatible alias — existing pages import `Stat`. */
export const Stat = StatCard;

/* ==========================================================================
   FRESHNESS SCORE  (the hero visualisation)
   ========================================================================== */
/**
 * Circular score gauge, 0–100.
 *
 * Gradient stroke, soft outer glow tinted by the band, animated draw on mount,
 * and an optional component breakdown revealed on hover/focus.
 */
export function ScoreRing({
  score,
  size = 116,
  label,
  sublabel,
  strokeWidth = 9,
  breakdown,
  className,
  glow = true,
}) {
  const reduced = useReducedMotion();
  const gradientId = useId().replace(/:/g, '');
  const value = score === null || score === undefined ? 0 : Math.max(0, Math.min(100, Number(score)));
  // The ring sweeps in, but the NUMBER is rendered at its true value from the
  // first frame. Counting a freshness score up from 0 would momentarily display
  // a "spoiled" reading, which is misleading for a food-safety figure.
  const animatedSweep = useCountUp(value, { duration: 1100 });
  const sweep = reduced ? value : animatedSweep;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (sweep / 100) * circumference;
  const color = scoreColor(score);
  const [open, setOpen] = useState(false);
  const hasBreakdown = Boolean(breakdown && Object.keys(breakdown).length);

  return (
    <div
      className={clsx('relative inline-flex flex-col items-center', className)}
      style={{ width: size }}
      onMouseEnter={hasBreakdown ? () => setOpen(true) : undefined}
      onMouseLeave={hasBreakdown ? () => setOpen(false) : undefined}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full blur-2xl transition-opacity duration-scene"
          style={{
            width: size * 0.82,
            height: size * 0.82,
            backgroundColor: color,
            opacity: 0.2,
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        className="relative -rotate-90"
        role="img"
        aria-label={`Score ${Math.round(value)} out of 100`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.72" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--edge-subtle))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 5px ${color}55)` }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="metric text-2xl leading-none" style={{ fontSize: size * 0.24 }}>
          {score === null || score === undefined ? '—' : Math.round(value)}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-content-tertiary">
          / 100
        </span>
      </div>

      {label && <p className="mt-2.5 text-sm font-bold tracking-tight text-content-primary">{label}</p>}
      {sublabel && <p className="mt-0.5 text-center text-xs text-content-tertiary">{sublabel}</p>}

      {/* Hover breakdown — the four weighted components at a glance. */}
      <AnimatePresence>
        {open && hasBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="glass absolute left-1/2 top-full z-30 mt-2 w-52 -translate-x-1/2 p-3"
          >
            <p className="eyebrow mb-2">Score components</p>
            <dl className="space-y-1.5">
              {Object.entries(breakdown).map(([key, componentValue]) => (
                <div key={key} className="flex items-center justify-between gap-2 text-xs">
                  <dt className="truncate text-content-secondary">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </dt>
                  <dd className="font-bold tabular-nums text-content-primary">
                    {componentValue === null || componentValue === undefined
                      ? '—'
                      : Math.round(componentValue)}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Horizontal score bar with an animated fill. */
export function ScoreBar({ value, max = 100, color, className, height = 'h-2', showTrack = true }) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, ((Number(value) || 0) / max) * 100));
  const [width, setWidth] = useState(reduced ? pct : 0);

  useEffect(() => {
    if (reduced) {
      setWidth(pct);
      return undefined;
    }
    const timer = setTimeout(() => setWidth(pct), 40);
    return () => clearTimeout(timer);
  }, [pct, reduced]);

  return (
    <div
      className={clsx(
        'w-full overflow-hidden rounded-full',
        showTrack && 'bg-surface-sunken',
        height,
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-scene ease-out"
        style={{ width: `${width}%`, backgroundColor: color || scoreColor(value) }}
        role="presentation"
      />
    </div>
  );
}

/* ==========================================================================
   LOADING STATES
   ========================================================================== */
export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />;
}

export function SkeletonCard({ lines = 3, className }) {
  return (
    <div className={clsx('surface-card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-7 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-7 w-2/5" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={clsx('h-2.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-edge-subtle bg-surface-sunken/60 px-4 py-3.5">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-edge-subtle">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={clsx('h-2.5', colIndex === 0 ? 'w-1/4' : 'flex-1')}
                style={{ animationDelay: `${rowIndex * 60}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder that mimics a chart rather than showing a blank box. */
export function SkeletonChart({ height = 260, className }) {
  const bars = [45, 68, 52, 80, 62, 90, 71, 58, 84, 66];
  return (
    <div className={clsx('flex items-end gap-2', className)} style={{ height }}>
      {bars.map((value, index) => (
        <div
          key={index}
          className="skeleton flex-1 rounded-t-md"
          style={{ height: `${value}%`, animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  );
}

/* ==========================================================================
   EMPTY / ERROR STATES
   ========================================================================== */
/** Decorative illustration — orbital rings around a soft core. */
function EmptyIllustration({ children }) {
  return (
    <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-dashed border-edge animate-[spin_28s_linear_infinite] motion-safe-only"
      />
      <span
        aria-hidden="true"
        className="absolute inset-3 rounded-full border border-edge-subtle"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[rgb(var(--accent)/0.07)] blur-xl"
      />
      <span
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl
          bg-surface-sunken text-2xl text-content-tertiary ring-1 ring-inset ring-edge-subtle
          [&>svg]:h-6 [&>svg]:w-6"
        aria-hidden="true"
      >
        {children}
      </span>
    </div>
  );
}

export function EmptyState({ icon = '🗂', title, description, action, className, compact = false }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-14',
        className,
      )}
    >
      {!compact && <EmptyIllustration>{icon}</EmptyIllustration>}
      {compact && (
        <span aria-hidden="true" className="mb-3 text-2xl text-content-tertiary [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </span>
      )}
      <h3 className="text-sm font-bold tracking-tight text-content-primary">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-content-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong', className, hints }) {
  const message = error?.message || 'The request could not be completed.';
  const code = error?.code && error.code !== 'UNKNOWN_ERROR' ? error.code : null;

  // Turn the machine code into actionable guidance rather than a stack trace.
  const defaultHints = {
    NETWORK_ERROR: ['The API may not be running', 'Check your connection'],
    TIMEOUT: ['The server is busy', 'Try again in a moment'],
    INVALID_IMAGE: ['Use a JPG or PNG file', 'Check the file is not corrupt'],
    FILE_TOO_LARGE: ['Reduce the image size', 'The limit is shown on the upload panel'],
    PERMISSION_DENIED: ['Your role does not allow this', 'Ask an administrator'],
  };
  const shown = hints || defaultHints[code] || null;

  return (
    <div
      role="alert"
      className={clsx(
        'rounded-2xl border border-rose-300/70 bg-rose-50/80 px-5 py-4',
        'dark:border-rose-400/25 dark:bg-rose-500/8',
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <IconPlate tone="danger" size="md">
          <AlertCircle />
        </IconPlate>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-100">{title}</h3>
          <p className="mt-1 break-words text-sm text-rose-800 dark:text-rose-200/90">{message}</p>

          {shown && (
            <ul className="mt-2.5 space-y-1">
              {shown.map((hint, index) => (
                <li
                  key={index}
                  className="flex items-start gap-1.5 text-xs text-rose-800/80 dark:text-rose-200/70"
                >
                  <CircleDot className="mt-0.5 h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  {hint}
                </li>
              ))}
            </ul>
          )}

          {error?.fields?.length > 0 && (
            <ul className="mt-2.5 space-y-1 text-xs text-rose-800 dark:text-rose-200/80">
              {error.fields.map((field, index) => (
                <li key={index}>
                  <span className="font-semibold">{field.field}</span>: {field.message}
                </li>
              ))}
            </ul>
          )}

          {code && <p className="mono mt-2 text-rose-700/70 dark:text-rose-300/60">code: {code}</p>}
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

const NOTICE_TONES = {
  info: {
    box: 'border-chill-300/70 bg-chill-50 dark:bg-chill-500/8/80 text-chill-700 dark:text-chill-300 dark:text-chill-200 dark:text-chill-100 dark:border-chill-400/25 dark:bg-chill-50 dark:bg-chill-500/80/8 dark:text-chill-100',
    Icon: Info,
    plate: 'info',
  },
  success: {
    box: 'border-[rgb(var(--accent)/0.4)]/70 bg-[rgb(var(--accent)/0.07)]/80 text-[rgb(var(--accent-ink))] dark:text-leaf-200 dark:border-leaf-400/25 dark:bg-[rgb(var(--accent)/0.07)]0/8 dark:text-leaf-100',
    Icon: Check,
    plate: 'positive',
  },
  warning: {
    box: 'border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/8 dark:text-amber-100',
    Icon: AlertTriangle,
    plate: 'warning',
  },
  danger: {
    box: 'border-rose-300/70 bg-rose-50/80 text-rose-900 dark:border-rose-400/25 dark:bg-rose-500/8 dark:text-rose-100',
    Icon: AlertCircle,
    plate: 'danger',
  },
  neutral: {
    box: 'border-edge bg-surface-sunken/70 text-content-primary',
    Icon: Info,
    plate: 'neutral',
  },
};

export function InlineNotice({ tone = 'info', title, children, className, icon }) {
  const meta = NOTICE_TONES[tone] || NOTICE_TONES.info;
  const Icon = meta.Icon;
  return (
    <div className={clsx('rounded-2xl border px-4 py-3.5 text-sm', meta.box, className)}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 shrink-0 [&>svg]:h-4 [&>svg]:w-4">
          {icon || <Icon />}
        </span>
        <div className="min-w-0 flex-1">
          {title && <p className="font-bold tracking-tight">{title}</p>}
          <div className={clsx('leading-relaxed', title && 'mt-1 opacity-90')}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   MODAL
   ========================================================================== */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', icon }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-char-1000/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              'relative z-10 max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-surface-overlay',
              'shadow-float ring-1 ring-edge-subtle sm:rounded-3xl',
              sizes[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-edge-subtle px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                {icon && <IconPlate tone="accent">{icon}</IconPlate>}
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-content-primary">{title}</h2>
                  {description && (
                    <p className="mt-0.5 text-sm leading-relaxed text-content-secondary">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-content-tertiary transition-colors duration-micro
                  hover:bg-surface-sunken hover:text-content-primary"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[66vh] overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-edge-subtle
                bg-surface-sunken/50 px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon={tone === 'danger' ? <AlertTriangle /> : <Info />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-content-secondary">{description}</p>
    </Modal>
  );
}

/* ==========================================================================
   FORM PARTS
   ========================================================================== */
export function Field({ label, htmlFor, hint, error, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx('input', invalid && 'border-rose-400 focus:border-rose-500', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select({ className, children, invalid, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx('select', invalid && 'border-rose-400', className)}
      {...rest}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={clsx('input resize-y', className)} {...rest} />;
});

/* ==========================================================================
   NAVIGATION BITS
   ========================================================================== */
/** Tabs with a sliding active indicator. */
export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div
      className={clsx('no-scrollbar flex gap-1 overflow-x-auto border-b border-edge-subtle', className)}
      role="tablist"
    >
      {tabs.map((tab) => {
        const selected = active === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={clsx(
              'relative whitespace-nowrap px-3.5 py-2.5 text-sm font-semibold transition-colors duration-micro',
              selected
                ? 'text-content-primary'
                : 'text-content-tertiary hover:text-content-secondary',
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={clsx(
                    'rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums',
                    selected
                      ? 'bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--accent-ink))]'
                      : 'bg-surface-sunken text-content-tertiary',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {selected && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                style={{ backgroundColor: 'rgb(var(--accent))' }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge-subtle px-4 py-3 text-sm">
      <p className="text-content-tertiary">
        Showing <span className="font-bold text-content-primary">{from}</span>–
        <span className="font-bold text-content-primary">{to}</span> of{' '}
        <span className="font-bold text-content-primary">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">
            Rows
            <Select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="w-20 py-1 text-xs"
              aria-label="Rows per page"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={<ChevronLeft />}
        >
          Previous
        </Button>
        <span className="px-1 text-xs font-semibold tabular-nums text-content-secondary">
          {page} / {totalPages || 1}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= (totalPages || 1)}
          onClick={() => onPageChange(page + 1)}
          iconRight={<ChevronRight />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function DataList({ items, className }) {
  return (
    <dl className={clsx('grid gap-x-6 gap-y-3.5 sm:grid-cols-2', className)}>
      {items
        .filter((item) => item)
        .map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-2xs font-bold uppercase tracking-wider text-content-tertiary">
              {item.label}
            </dt>
            <dd className="mt-1 break-words text-sm text-content-primary">{item.value ?? '—'}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Numbered progress rail used by the analysis workflow. */
export function ProgressSteps({ steps, current, className }) {
  return (
    <ol className={clsx('flex flex-wrap items-center gap-y-2', className)}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo';
        return (
          <li key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={clsx(
                  'relative flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold transition-all duration-card',
                  state === 'done' && 'text-[rgb(var(--accent-contrast))]',
                  state === 'active' && 'bg-surface-raised ring-2',
                  state === 'todo' && 'bg-surface-sunken text-content-tertiary ring-1 ring-edge-subtle',
                )}
                style={
                  state === 'done'
                    ? { backgroundColor: 'rgb(var(--accent))' }
                    : state === 'active'
                      ? {
                          color: 'rgb(var(--accent))',
                          boxShadow: '0 0 0 2px rgb(var(--accent)), 0 0 14px 0 rgb(var(--accent)/0.4)',
                        }
                      : undefined
                }
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" /> : index + 1}
                {state === 'active' && (
                  <span
                    className="motion-safe-only absolute inset-0 animate-pulse-ring rounded-full"
                    style={{ backgroundColor: 'rgb(var(--accent)/0.4)' }}
                  />
                )}
              </span>
              <span
                className={clsx(
                  'text-xs font-semibold sm:text-sm',
                  state === 'todo' ? 'text-content-tertiary' : 'text-content-primary',
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="mx-2.5 h-px w-6 sm:w-10"
                style={{
                  backgroundColor:
                    index < current ? 'rgb(var(--accent)/0.5)' : 'rgb(var(--edge-subtle))',
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
