/**
 * Domain components — the food-tech specific building blocks.
 *
 * Public API is unchanged from the previous version so pages did not need
 * editing; the implementations are what became premium.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpNarrowWide,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  Eye,
  Gauge,
  ImageIcon,
  Info,
  Lightbulb,
  MapPin,
  ScanLine,
  Sparkles,
  Thermometer,
  Wind,
} from 'lucide-react';
import { fetchImageObjectUrl } from '../services/apiClient';
import { recommendationApi } from '../services';
import { useToast } from '../context/ToastContext';
import { useReducedMotion } from '../hooks/motion';
import {
  AIBadge,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ComplianceBadge,
  DemoBadge,
  EmptyState,
  IconPlate,
  InlineNotice,
  PriorityBadge,
  ScoreBar,
  ScoreRing,
  SeverityBadge,
  Skeleton,
  StatusBadge,
} from './ui';
import {
  categoryIconComponent,
  daysUntilLabel,
  formatDate,
  formatDateTime,
  formatHumidity,
  formatPercent,
  formatQuantity,
  formatRelative,
  formatTemperature,
  recommendationMeta,
  scoreColor,
  titleise,
} from '../utils/format';

/* ==========================================================================
   PROTECTED IMAGE
   ========================================================================== */
/**
 * Image whose bytes require the bearer token.
 * A plain <img src> would be rejected with 401, so the blob is fetched and
 * turned into an object URL (revoked on unmount to avoid leaking memory).
 */
export function ProtectedImage({ path, alt, className, fallback, zoom = false }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    if (!path) return undefined;

    fetchImageObjectUrl(path)
      .then((result) => {
        if (cancelled) {
          if (result) URL.revokeObjectURL(result);
          return;
        }
        objectUrl = result;
        setUrl(result);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!path || failed) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center bg-surface-sunken text-content-tertiary',
          '[&>svg]:h-7 [&>svg]:w-7',
          className,
        )}
        aria-hidden="true"
      >
        {fallback || <ImageIcon />}
      </div>
    );
  }
  if (!url) return <Skeleton className={className} />;

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={clsx(
        className,
        zoom && 'transition-transform duration-scene ease-out group-hover:scale-[1.04]',
      )}
    />
  );
}

/* ==========================================================================
   AI SCANNING OVERLAY
   ========================================================================== */
/**
 * Elegant computer-vision scanning treatment laid over the uploaded image.
 *
 * Corner brackets + a faint measurement grid + a single sweeping light bar +
 * pulsing detection nodes. Restrained on purpose: it should read as a
 * laboratory instrument, not a radar game.
 */
export function ScanningOverlay({ active = true, nodes = 5, className }) {
  const reduced = useReducedMotion();
  // Deterministic node placement so the overlay does not jitter between renders.
  const positions = Array.from({ length: nodes }, (_, index) => {
    const golden = 0.618033988749895;
    return {
      left: `${12 + ((index * golden * 100) % 74)}%`,
      top: `${18 + ((index * golden * 61) % 60)}%`,
      delay: `${index * 260}ms`,
    };
  });

  return (
    <div className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {/* Measurement grid */}
      <div className="scan-grid absolute inset-0 opacity-40" />

      {/* Corner brackets */}
      {[
        'left-3 top-3 border-l-2 border-t-2 rounded-tl-md',
        'right-3 top-3 border-r-2 border-t-2 rounded-tr-md',
        'left-3 bottom-3 border-l-2 border-b-2 rounded-bl-md',
        'right-3 bottom-3 border-r-2 border-b-2 rounded-br-md',
      ].map((corner) => (
        <span
          key={corner}
          className={clsx('absolute h-7 w-7', corner)}
          style={{ borderColor: 'rgb(var(--accent))' }}
        />
      ))}

      {/* Sweeping scan bar */}
      {active && !reduced && <div className="scan-line" />}

      {/* Detection nodes */}
      {active &&
        positions.map((node, index) => (
          <span
            key={index}
            className="absolute flex h-3 w-3 items-center justify-center"
            style={{ left: node.left, top: node.top }}
          >
            <span
              className={clsx('absolute inset-0 rounded-full', !reduced && 'animate-pulse-ring')}
              style={{ backgroundColor: 'rgb(var(--accent)/0.5)', animationDelay: node.delay }}
            />
            <span
              className="relative h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'rgb(var(--accent))' }}
            />
          </span>
        ))}
    </div>
  );
}

/**
 * Full "analysing" panel: the image under a live scanning treatment, with the
 * pipeline stages ticking off beside it. Replaces a bare spinner.
 */
export function AIAnalysisPanel({ previewUrl, stages = [], current = 0, className }) {
  const reduced = useReducedMotion();
  const progress = stages.length ? Math.min(100, (current / stages.length) * 100) : 0;

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <div className="grid gap-0 lg:grid-cols-[1.05fr,1fr]">
        {/* ---- image + scanning treatment ---- */}
        <div className="relative min-h-[280px] bg-surface-sunken">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" aria-hidden="true" />
          ) : (
            <div className="flex h-full items-center justify-center text-content-tertiary">
              <ImageIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-char-1000/45 via-transparent to-char-1000/20" />
          <ScanningOverlay active nodes={6} />

          <div className="absolute inset-x-4 bottom-4 flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-lg"
              style={{ backgroundColor: 'rgb(var(--accent))' }}
            >
              <ScanLine className={clsx('h-4 w-4', !reduced && 'animate-pulse-soft')} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white drop-shadow">Computer vision pipeline</p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full transition-[width] duration-card ease-out"
                  style={{ width: `${progress}%`, backgroundColor: 'rgb(var(--accent))' }}
                />
              </div>
            </div>
            <span className="mono shrink-0 text-white drop-shadow">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* ---- stage checklist ---- */}
        <div className="p-6">
          <div className="flex items-center gap-2">
            <AIBadge>AI</AIBadge>
            <p className="eyebrow">Analysing</p>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-content-primary">
            Reading visual characteristics
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-content-secondary">
            Measuring colour and texture descriptors, isolating the food region and
            evaluating spoilage indicators.
          </p>

          <ul className="mt-5 space-y-1">
            {stages.map((stage, index) => {
              const done = index < current;
              const activeStage = index === current;
              return (
                <li
                  key={stage}
                  className={clsx(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors duration-card',
                    done && 'text-content-secondary',
                    activeStage && 'bg-[rgb(var(--accent)/0.08)] font-semibold text-content-primary',
                    !done && !activeStage && 'text-content-tertiary',
                  )}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {done ? (
                      <Check className="h-3.5 w-3.5" style={{ color: 'rgb(var(--accent))' }} />
                    ) : activeStage ? (
                      <span
                        className={clsx('h-2 w-2 rounded-full', !reduced && 'animate-pulse-soft')}
                        style={{ backgroundColor: 'rgb(var(--accent))' }}
                      />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-current opacity-50" />
                    )}
                  </span>
                  {stage}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ==========================================================================
   FOOD / BATCH CARD
   ========================================================================== */
/**
 * Premium food card: image with hover zoom, status overlay, score, and the two
 * numbers that matter most (shelf life, expiry).
 */
export function FoodCard({
  batch,
  imagePath,
  className,
  showAction = true,
  /* Optional inventory context. The grid view of the inventory table passes
     these so it stays informationally equivalent to the table view. */
  quantity,
  unit,
  priority,
  to,
}) {
  const product = batch.product || {};
  const days = batch.days_until_expiry;
  const CategoryIcon = categoryIconComponent(product.category_slug);
  const score = batch.current_freshness_score;
  const colour = scoreColor(score);

  return (
    <Card hover className={clsx('group relative flex flex-col overflow-hidden', className)}>
      <Link to={to || `/batches/${batch.id}`} className="flex flex-1 flex-col">
        {/* ---- image ---- */}
        <div className="relative h-36 overflow-hidden bg-surface-sunken">
          <ProtectedImage
            path={imagePath}
            alt={`${product.name || 'Batch'} photograph`}
            className="h-36 w-full object-cover"
            fallback={<CategoryIcon />}
            zoom
          />
          <div className="absolute inset-0 bg-gradient-to-t from-char-1000/62 via-char-1000/8 to-transparent" />

          <div className="absolute left-3 top-3">
            <StatusBadge
              status={batch.current_freshness_category || batch.status}
              className="shadow-sm backdrop-blur-sm"
            />
          </div>

          {/* Rotation priority: how urgently this should be used. */}
          {priority != null && (
            <div className="absolute bottom-2.5 right-3">
              <span
                className="badge bg-char-1000/55 text-white ring-white/20 backdrop-blur-sm"
                title="Rotation priority - higher means use it sooner"
              >
                <ArrowUpNarrowWide className="h-3 w-3" aria-hidden="true" />
                <span className="mono">{Number(priority).toFixed(0)}</span>
              </span>
            </div>
          )}

          {/* Score chip, tinted by band. */}
          <div className="absolute right-3 top-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-lg ring-1 ring-white/25"
              style={{ backgroundColor: colour }}
            >
              {score === null || score === undefined ? '—' : Math.round(score)}
            </span>
          </div>

          <div className="absolute inset-x-3 bottom-2.5">
            <p className="truncate text-sm font-bold text-white drop-shadow-sm">
              {product.name || '—'}
            </p>
            <p className="mono truncate text-white/75">{batch.batch_number}</p>
          </div>
        </div>

        {/* ---- facts ---- */}
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-content-secondary">
              <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {product.category_name || titleise(product.category_slug)}
            </span>
            <span className="font-semibold text-content-primary">
              {formatQuantity(quantity ?? batch.quantity, unit ?? batch.unit)}
            </span>
          </div>

          {score !== null && score !== undefined && (
            <ScoreBar value={score} height="h-1.5" />
          )}

          <dl className="mt-0.5 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-content-tertiary">Shelf life</dt>
              <dd className="mt-0.5 font-semibold text-content-primary">
                {batch.remaining_shelf_life_days === null ||
                batch.remaining_shelf_life_days === undefined
                  ? '—'
                  : `${Number(batch.remaining_shelf_life_days).toFixed(1)} d`}
              </dd>
            </div>
            <div>
              <dt className="text-content-tertiary">Expiry</dt>
              <dd
                className={clsx(
                  'mt-0.5 font-semibold',
                  days !== null && days !== undefined && days < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : days !== null && days !== undefined && days <= 2
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-content-primary',
                )}
              >
                {daysUntilLabel(days)}
              </dd>
            </div>
          </dl>

          {batch.storage_location && (
            <p className="inline-flex items-center gap-1 truncate text-xs text-content-tertiary">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              {batch.storage_location}
            </p>
          )}

          {showAction && (
            <span
              className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-bold
                text-[rgb(var(--accent-ink))] opacity-0 transition-opacity duration-card group-hover:opacity-100"
            >
              View analysis
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
        </div>
      </Link>
    </Card>
  );
}

/** Kept for backwards compatibility — pages import `BatchCard`. */
export const BatchCard = FoodCard;

/* ==========================================================================
   SHELF-LIFE TIMELINE
   ========================================================================== */
/**
 * Horizontal timeline from today to expiry, with the confidence interval shown
 * as a band and the predicted point marked. Makes expiry visually prominent.
 */
export function ShelfLifeTimeline({ prediction, labelExpiry, className }) {
  if (!prediction) return null;

  const remaining = Number(prediction.remaining_shelf_life_days ?? 0);
  const lower = Number(prediction.lower_bound_days ?? remaining);
  const upper = Number(prediction.upper_bound_days ?? remaining);
  // Scale the axis a little beyond the upper bound so the marker is never flush.
  const span = Math.max(1, upper * 1.15, remaining * 1.3, 1);
  const pct = (days) => Math.max(0, Math.min(100, (days / span) * 100));
  const colour = scoreColor(remaining <= 1 ? 10 : remaining <= 3 ? 45 : remaining <= 7 ? 70 : 95);

  const ticks = [0, span * 0.25, span * 0.5, span * 0.75, span].map((d) => Math.round(d));

  return (
    <div className={clsx('select-none', className)}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="eyebrow">Today</span>
        <span className="eyebrow">
          {labelExpiry ? `Label expiry ${formatDate(labelExpiry)}` : 'Predicted expiry'}
        </span>
      </div>

      <div className="relative h-14">
        {/* Track */}
        <div className="absolute inset-x-0 top-4 h-2.5 overflow-hidden rounded-full bg-surface-sunken">
          {/* Confidence band */}
          <div
            className="absolute inset-y-0 rounded-full opacity-28"
            style={{
              left: `${pct(lower)}%`,
              width: `${Math.max(2, pct(upper) - pct(lower))}%`,
              backgroundColor: colour,
            }}
          />
          {/* Elapsed / remaining fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-scene ease-out"
            style={{ width: `${pct(remaining)}%`, backgroundColor: colour, opacity: 0.85 }}
          />
        </div>

        {/* Predicted marker */}
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-scene ease-out"
          style={{ left: `${pct(remaining)}%` }}
        >
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: colour }}
          >
            {remaining.toFixed(1)}d
          </span>
          <span className="h-4 w-0.5" style={{ backgroundColor: colour }} />
        </div>

        {/* Ticks */}
        <div className="absolute inset-x-0 top-8 flex justify-between">
          {ticks.map((tick, index) => (
            <span key={index} className="flex flex-col items-center gap-1">
              <span className="h-1.5 w-px bg-edge" />
              <span className="mono text-[10px] text-content-tertiary">{tick}d</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5 text-content-secondary">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Predicted {formatDate(prediction.predicted_expiry_date)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-content-tertiary">
          <span className="h-2 w-4 rounded-full opacity-30" style={{ backgroundColor: colour }} />
          interval {lower.toFixed(1)}–{upper.toFixed(1)}d
        </span>
      </div>
    </div>
  );
}

/* ==========================================================================
   ALERTS
   ========================================================================== */
const ALERT_TONE = {
  CRITICAL: {
    rail: 'bg-rose-500',
    tint: 'bg-rose-50/70 dark:bg-rose-500/8',
    plate: 'danger',
  },
  HIGH: { rail: 'bg-amber-500', tint: 'bg-amber-50/70 dark:bg-amber-500/8', plate: 'warning' },
  MEDIUM: { rail: 'bg-amber-400', tint: 'bg-amber-50/50 dark:bg-amber-500/6', plate: 'warning' },
  LOW: { rail: 'bg-char-300', tint: '', plate: 'neutral' },
  INFO: { rail: 'bg-chill-400', tint: '', plate: 'info' },
};

/** Severity-led alert card with a colour rail and inline actions. */
export function AlertCard({ alert, onUpdate, compact = false, className }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const tone = ALERT_TONE[String(alert.severity || 'INFO').toUpperCase()] || ALERT_TONE.INFO;

  async function act(payload) {
    setBusy(true);
    try {
      await onUpdate?.(alert.id, payload);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-edge-subtle transition-shadow duration-card',
        !alert.resolved && tone.tint,
        !alert.is_read && 'shadow-sm',
        'hover:shadow-card',
        className,
      )}
    >
      {/* Severity rail */}
      <span aria-hidden="true" className={clsx('absolute inset-y-0 left-0 w-1', tone.rail)} />

      <div className="flex gap-3.5 p-4 pl-5">
        <IconPlate tone={tone.plate} size="md">
          {alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? (
            <AlertTriangle />
          ) : (
            <Info />
          )}
        </IconPlate>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <span className="text-2xs font-bold uppercase tracking-wider text-content-tertiary">
              {titleise(alert.alert_type)}
            </span>
            {alert.resolved && (
              <Badge className="bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] dark:text-leaf-400 ring-[rgb(var(--accent)/0.22)]/70 dark:bg-[rgb(var(--accent)/0.07)]0/10 dark:text-leaf-300 dark:ring-leaf-400/20">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Resolved
              </Badge>
            )}
            {!alert.is_read && !alert.resolved && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'rgb(var(--accent))' }}
                aria-label="Unread"
              />
            )}
          </div>

          <p className="mt-1.5 text-sm font-bold tracking-tight text-content-primary">{alert.title}</p>
          {!compact && (
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">{alert.message}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-tertiary">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatRelative(alert.created_at)}
            </span>
            {alert.batch_id && (
              <Link
                to={`/batches/${alert.batch_id}`}
                className="mono font-semibold text-[rgb(var(--accent-ink))] hover:underline"
              >
                {alert.batch_number || `Batch #${alert.batch_id}`}
              </Link>
            )}
            {alert.product_name && <span className="truncate">{alert.product_name}</span>}
          </div>

          {onUpdate && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {alert.batch_id && (
                <Link to={`/batches/${alert.batch_id}`}>
                  <Button variant="secondary" size="sm" iconRight={<ChevronRight />}>
                    View batch
                  </Button>
                </Link>
              )}
              {!alert.is_read && (
                <Button variant="ghost" size="sm" loading={busy} onClick={() => act({ is_read: true })}>
                  Mark read
                </Button>
              )}
              {!alert.resolved && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={busy}
                  onClick={() => act({ resolved: true, is_read: true })}
                >
                  Resolve
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Kept for compatibility — pages import `AlertRow`. */
export const AlertRow = AlertCard;

export function AlertList({ alerts = [], onUpdate, emptyTitle = 'No open alerts', compact }) {
  if (!alerts.length) {
    return (
      <EmptyState
        icon={<CheckCircle2 />}
        title={emptyTitle}
        description="Alerts are raised automatically when freshness drops, shelf life runs short or storage drifts out of range."
      />
    );
  }
  return (
    <div className="space-y-2.5 p-4">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onUpdate={onUpdate} compact={compact} />
      ))}
    </div>
  );
}

/* ==========================================================================
   RECOMMENDATIONS
   ========================================================================== */
/** AI recommendation card: action, reasoning, evidence and expected impact. */
export function RecommendationCard({ recommendation, onAcknowledged, className }) {
  const meta = recommendationMeta(recommendation.recommendation_type);
  const Icon = meta.Icon || Lightbulb;
  const [busy, setBusy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const toast = useToast();

  async function acknowledge() {
    setBusy(true);
    try {
      await recommendationApi.acknowledge(recommendation.id);
      toast.success('Recommendation acknowledged.');
      onAcknowledged?.(recommendation.id);
    } catch (err) {
      toast.apiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-2xl border border-edge-subtle bg-surface-raised p-4',
        'transition-all duration-card hover:shadow-card',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full
          bg-[rgb(var(--accent)/0.07)] opacity-0 blur-2xl transition-opacity duration-card
          group-hover:opacity-100"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={clsx(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
              meta.accent,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <AIBadge title="Generated by the rule-based recommendation engine">AI</AIBadge>
              <span className="text-2xs font-bold uppercase tracking-wider text-content-tertiary">
                {meta.label}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold tracking-tight text-content-primary">
              {recommendation.title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={recommendation.priority} />
              {recommendation.acknowledged && (
                <Badge className="bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] dark:text-leaf-400 ring-[rgb(var(--accent)/0.22)]/70 dark:bg-[rgb(var(--accent)/0.07)]0/10 dark:text-leaf-300 dark:ring-leaf-400/20">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Acknowledged
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!recommendation.acknowledged && onAcknowledged && (
          <Button variant="secondary" size="sm" loading={busy} onClick={acknowledge}>
            {recommendation.action_label || 'Acknowledge'}
          </Button>
        )}
      </div>

      <p className="relative mt-3 text-sm leading-relaxed text-content-secondary">
        {recommendation.message}
      </p>

      {recommendation.expected_impact && (
        <div className="relative mt-2.5 flex items-start gap-2 rounded-xl bg-[rgb(var(--accent)/0.06)] px-3 py-2">
          <Gauge className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[rgb(var(--accent-ink))]" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-content-secondary">
            <span className="font-bold text-content-primary">Expected impact: </span>
            {recommendation.expected_impact}
          </p>
        </div>
      )}

      {(recommendation.rationale || recommendation.rule_id) && (
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-bold text-content-tertiary
              transition-colors duration-micro hover:text-content-primary"
            aria-expanded={showWhy}
          >
            <Eye className="h-3 w-3" aria-hidden="true" />
            {showWhy ? 'Hide reasoning' : 'Why am I seeing this?'}
          </button>
          <AnimatePresence initial={false}>
            {showWhy && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-xl bg-surface-sunken p-3 text-xs leading-relaxed text-content-secondary">
                  {recommendation.rationale && <p>{recommendation.rationale}</p>}
                  {recommendation.rule_id && (
                    <p className="mono mt-2 text-content-tertiary">rule: {recommendation.rule_id}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function RecommendationList({ recommendations = [], onAcknowledged, emptyTitle }) {
  if (!recommendations.length) {
    return (
      <EmptyState
        icon={<Lightbulb />}
        title={emptyTitle || 'No recommendations right now'}
        description="Run an analysis to generate storage, consumption, rotation and waste-reduction suggestions."
      />
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          onAcknowledged={onAcknowledged}
        />
      ))}
    </div>
  );
}

/* ==========================================================================
   EXPLAINABLE AI PANEL
   ========================================================================== */
const COMPONENT_LABELS = {
  visual: {
    label: 'Visual Condition',
    help: 'Colour degradation and surface texture from the image.',
    Icon: Eye,
  },
  storage: {
    label: 'Storage Conditions',
    help: 'Temperature and humidity versus the recommended range.',
    Icon: Thermometer,
  },
  shelf_life: {
    label: 'Shelf-Life Prediction',
    help: 'Remaining life as a share of the expected total.',
    Icon: Clock,
  },
  product_age: {
    label: 'Product Age',
    help: 'How much of the expected life has already elapsed.',
    Icon: CalendarClock,
  },
};

/** "Why this score?" — the explainable-AI panel required by the specification. */
export function ScoreExplanation({ assessment, weights, className }) {
  const components = assessment.components || {};
  const usedWeights = assessment.weights_used || weights || {
    visual: 0.4,
    storage: 0.25,
    shelf_life: 0.2,
    product_age: 0.15,
  };

  const rows = ['visual', 'storage', 'shelf_life', 'product_age'].map((key) => ({
    key,
    ...COMPONENT_LABELS[key],
    score: components[key],
    weight: usedWeights[key],
    contribution: (components[key] ?? 0) * (usedWeights[key] ?? 0),
  }));

  return (
    <Card className={className}>
      <CardHeader
        icon={<Sparkles />}
        title="Why this score?"
        subtitle="The weighted model behind the final freshness figure"
        actions={assessment.model?.is_demo ? <DemoBadge label={assessment.model.label} /> : null}
      />
      <CardBody className="space-y-5">
        <div className="space-y-4">
          {rows.map((row) => {
            const RowIcon = row.Icon;
            return (
              <div key={row.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-content-primary">
                    <RowIcon className="h-3.5 w-3.5 text-content-tertiary" aria-hidden="true" />
                    {row.label}
                    <span className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-2xs font-bold text-content-secondary">
                      {formatPercent(row.weight, { fromFraction: true })}
                    </span>
                  </p>
                  <p className="text-sm tabular-nums text-content-primary">
                    <span className="font-bold">
                      {row.score === null || row.score === undefined ? '—' : Math.round(row.score)}
                    </span>
                    <span className="text-content-tertiary">/100</span>
                    <span className="ml-2 text-xs text-content-secondary">
                      → {row.contribution.toFixed(1)} pts
                    </span>
                  </p>
                </div>
                <ScoreBar value={row.score} className="mt-2" height="h-1.5" />
                <p className="mt-1.5 text-xs text-content-tertiary">{row.help}</p>
              </div>
            );
          })}
        </div>

        {/* The arithmetic, spelled out. */}
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-[rgb(var(--accent)/0.07)] px-4 py-3.5">
          <div className="min-w-0">
            <p className="eyebrow" style={{ color: 'rgb(var(--accent))' }}>
              Final score
            </p>
            <p className="mono mt-1 break-words text-content-secondary">
              {rows
                .map(
                  (row) =>
                    `${formatPercent(row.weight, { fromFraction: true })} × ${Math.round(row.score ?? 0)}`,
                )
                .join('  +  ')}
            </p>
          </div>
          <p className="metric shrink-0 text-3xl" style={{ color: 'rgb(var(--accent))' }}>
            {Math.round(assessment.freshness_score)}
          </p>
        </div>

        <InlineNotice tone="neutral" title="This is an AI estimate">
          Produced from measurable image features and the storage data supplied. Prediction
          confidence was {formatPercent(assessment.confidence, { fromFraction: true })}. It is not a
          laboratory measurement and carries no guarantee of food safety.
        </InlineNotice>
      </CardBody>
    </Card>
  );
}

/* ==========================================================================
   SPOILAGE INDICATORS
   ========================================================================== */
export function IndicatorList({ indicators = [], showUndetected = false, className }) {
  const shown = showUndetected ? indicators : indicators.filter((i) => i.detected);

  if (!shown.length) {
    return (
      <InlineNotice tone="success" title="No spoilage indicators detected" className={className}>
        The image analysis found no mould, bruising, discoloration or physical damage above the
        detection thresholds.
      </InlineNotice>
    );
  }

  return (
    <ul className={clsx('space-y-2.5', className)}>
      {shown.map((indicator, index) => (
        <li
          key={`${indicator.indicator_type}-${index}`}
          className={clsx(
            'rounded-xl border p-3.5 transition-colors duration-card',
            indicator.detected
              ? 'border-amber-300/60 bg-amber-50/60 dark:border-amber-400/22 dark:bg-amber-500/7'
              : 'border-edge-subtle bg-surface-raised',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-content-primary">
              {indicator.detected ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-leaf-500" aria-hidden="true" />
              )}
              {indicator.label}
            </p>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={indicator.severity} />
              <span className="mono text-content-secondary">
                {formatPercent(indicator.confidence, { fromFraction: true })}
              </span>
            </div>
          </div>

          {indicator.affected_area_ratio ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0 text-xs text-content-tertiary">Affected surface</span>
              <ScoreBar
                value={Math.min(100, indicator.affected_area_ratio * 100)}
                color="#f5b229"
                height="h-1"
                className="max-w-[8rem]"
              />
              <span className="mono text-content-secondary">
                {formatPercent(indicator.affected_area_ratio, { fromFraction: true, digits: 1 })}
              </span>
            </div>
          ) : null}

          {indicator.description && (
            <p className="mt-2 text-xs leading-relaxed text-content-secondary">
              {indicator.description}
            </p>
          )}
          <p className="mono mt-2 text-[10px] text-content-tertiary">
            detector: {indicator.detector}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ==========================================================================
   STORAGE
   ========================================================================== */
/** Environmental readout tile with the required range and live deviation. */
function EnvTile({ icon, label, value, range, tone = 'info', status }) {
  const tones = {
    info: 'from-chill-500/12 to-chill-500/0 text-chill-700 dark:text-chill-300 dark:text-chill-200 dark:text-chill-200',
    neutral: 'from-char-500/10 to-char-500/0 text-content-primary',
    positive: 'from-leaf-500/12 to-leaf-500/0 text-[rgb(var(--accent-ink))] dark:text-leaf-200',
    warning: 'from-amber-500/14 to-amber-500/0 text-amber-800 dark:text-amber-200',
    danger: 'from-rose-500/14 to-rose-500/0 text-rose-800 dark:text-rose-200',
  };
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-edge-subtle bg-gradient-to-br p-4',
        tones[tone] || tones.info,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span aria-hidden="true" className="opacity-70 [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      </div>
      <p className="metric mt-2 text-2xl">{value}</p>
      {range && <p className="mt-1 text-xs opacity-80">{range}</p>}
      {status && <div className="mt-2">{status}</div>}
    </div>
  );
}

export function StorageSnapshotCard({ snapshot, className, actions }) {
  if (!snapshot) return null;
  const current = snapshot.current || {};
  const required = snapshot.required || {};

  const tempTone = (() => {
    const violation = (snapshot.violations || []).find((v) => v.parameter === 'temperature');
    if (!violation) return 'info';
    return violation.status === 'NON_COMPLIANT' ? 'danger' : 'warning';
  })();
  const humTone = (() => {
    const violation = (snapshot.violations || []).find((v) => v.parameter === 'humidity');
    if (!violation) return 'neutral';
    return violation.status === 'NON_COMPLIANT' ? 'danger' : 'warning';
  })();

  return (
    <Card className={className}>
      <CardHeader
        icon={<Thermometer />}
        title="Storage environment"
        subtitle={snapshot.location_name || 'No location recorded'}
        actions={
          <div className="flex items-center gap-2">
            <ComplianceBadge status={snapshot.compliance_status} />
            {actions}
          </div>
        }
      />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <EnvTile
            icon={<Thermometer />}
            label="Temperature"
            value={formatTemperature(current.temperature_c)}
            range={`Recommended ${required.temp_min_c}–${required.temp_max_c} °C`}
            tone={tempTone}
          />
          <EnvTile
            icon={<Droplets />}
            label="Humidity"
            value={formatHumidity(current.humidity_pct)}
            range={`Recommended ${required.humidity_min_pct}–${required.humidity_max_pct}%`}
            tone={humTone}
          />
          <EnvTile
            icon={<Gauge />}
            label="Storage score"
            value={
              snapshot.storage_score === null || snapshot.storage_score === undefined
                ? '—'
                : `${Math.round(snapshot.storage_score)}`
            }
            range={`Risk: ${titleise(snapshot.risk_level)}`}
            tone={
              snapshot.storage_score >= 85
                ? 'positive'
                : snapshot.storage_score >= 60
                  ? 'warning'
                  : 'danger'
            }
          />
        </div>

        <div className="grid gap-2 text-xs text-content-secondary sm:grid-cols-3">
          <p className="inline-flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-content-tertiary" aria-hidden="true" />
            Air circulation: {titleise(current.air_circulation) || '—'}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-content-tertiary" aria-hidden="true" />
            Light: {titleise(current.light_exposure) || '—'}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-content-tertiary" aria-hidden="true" />
            Duration:{' '}
            {snapshot.storage_duration_days !== null && snapshot.storage_duration_days !== undefined
              ? `${Number(snapshot.storage_duration_days).toFixed(0)} day(s)`
              : '—'}
          </p>
        </div>

        {snapshot.violations?.length > 0 && (
          <ul className="space-y-2">
            {snapshot.violations.map((violation, index) => (
              <li
                key={index}
                className={clsx(
                  'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs',
                  violation.status === 'NON_COMPLIANT'
                    ? 'border-rose-300/60 bg-rose-50/70 text-rose-900 dark:border-rose-400/22 dark:bg-rose-500/8 dark:text-rose-200'
                    : violation.status === 'WARNING'
                      ? 'border-amber-300/60 bg-amber-50/70 text-amber-900 dark:border-amber-400/22 dark:bg-amber-500/8 dark:text-amber-200'
                      : 'border-edge-subtle bg-surface-sunken text-content-secondary',
                )}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-bold">{titleise(violation.parameter)}:</span>{' '}
                  {violation.message}
                </span>
              </li>
            ))}
          </ul>
        )}

        {snapshot.recommendation && (
          <InlineNotice tone="info" title="Recommended action">
            {snapshot.recommendation}
          </InlineNotice>
        )}

        <p className="text-[11px] leading-relaxed text-content-tertiary">{snapshot.disclaimer}</p>
      </CardBody>
    </Card>
  );
}

/* ==========================================================================
   SHELF LIFE CARD
   ========================================================================== */
export function ShelfLifeCard({ prediction, labelExpiry, className }) {
  if (!prediction) return null;
  const model = prediction.model || {};

  return (
    <Card className={className}>
      <CardHeader
        icon={<Clock />}
        title="Shelf-life prediction"
        subtitle={model.label}
        actions={model.is_demo ? <DemoBadge label="Baseline" /> : <AIBadge>Trained</AIBadge>}
      />
      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="eyebrow">Remaining</p>
            <p className="metric mt-1 text-3xl">
              {Number(prediction.remaining_shelf_life_days).toFixed(1)}
              <span className="ml-1 text-sm font-medium text-content-tertiary">days</span>
            </p>
          </div>
          <div>
            <p className="eyebrow">Predicted expiry</p>
            <p className="mt-1.5 text-sm font-bold text-content-primary">
              {formatDate(prediction.predicted_expiry_date)}
            </p>
          </div>
          <div>
            <p className="eyebrow">Risk / confidence</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge
                className={
                  prediction.risk_level === 'CRITICAL'
                    ? 'bg-rose-100/80 text-rose-800 ring-rose-300/70 dark:bg-rose-500/14 dark:text-rose-200 dark:ring-rose-400/30'
                    : prediction.risk_level === 'HIGH'
                      ? 'bg-amber-200/70 text-amber-900 ring-amber-400/60 dark:bg-amber-500/18 dark:text-amber-100 dark:ring-amber-400/35'
                      : prediction.risk_level === 'MEDIUM'
                        ? 'bg-amber-100/80 text-amber-800 ring-amber-300/70 dark:bg-amber-500/14 dark:text-amber-200 dark:ring-amber-400/30'
                        : 'bg-[rgb(var(--accent)/0.12)]/80 text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]/70 dark:bg-[rgb(var(--accent)/0.07)]0/14 dark:text-leaf-200 dark:ring-leaf-400/30'
                }
              >
                {titleise(prediction.risk_level)}
              </Badge>
              <span className="mono text-content-secondary">
                {formatPercent(prediction.confidence, { fromFraction: true })}
              </span>
            </div>
          </div>
        </div>

        <ShelfLifeTimeline prediction={prediction} labelExpiry={labelExpiry} />

        {prediction.explanation && (
          <details className="group rounded-2xl bg-surface-sunken p-3.5">
            <summary className="cursor-pointer list-none text-xs font-bold text-content-secondary transition-colors hover:text-content-primary">
              <span className="inline-flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 transition-transform duration-micro group-open:rotate-90" aria-hidden="true" />
                How this estimate was produced
              </span>
            </summary>
            <p className="mt-2.5 text-xs leading-relaxed text-content-secondary">
              {prediction.explanation}
            </p>
            {prediction.factors && (
              <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                {Object.entries(prediction.factors).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <dt className="text-content-tertiary">{titleise(key)}</dt>
                    <dd className="mono text-content-primary">
                      {typeof value === 'number' ? value.toFixed(2) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </details>
        )}
      </CardBody>
    </Card>
  );
}

/* ==========================================================================
   ASSESSMENT SUMMARY
   ========================================================================== */
export function AssessmentSummary({ assessment, className }) {
  return (
    <Card className={className}>
      <CardBody>
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing
            score={assessment.freshness_score}
            size={128}
            label={titleise(assessment.freshness_category)}
            sublabel={`${formatPercent(assessment.confidence, { fromFraction: true })} confidence`}
            breakdown={assessment.components}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={assessment.freshness_category} />
              {assessment.model?.is_demo && <DemoBadge label={assessment.model.label} />}
              {assessment.processing_ms && (
                <span className="mono text-content-tertiary">
                  analysed in {assessment.processing_ms} ms
                </span>
              )}
            </div>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3">
                <dt className="text-content-secondary">Spoilage probability</dt>
                <dd className="font-bold tabular-nums text-content-primary">
                  {formatPercent(assessment.spoilage_probability, { fromFraction: true })}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-content-secondary">Overall health score</dt>
                <dd className="font-bold tabular-nums text-content-primary">
                  {assessment.overall_health_score === null ||
                  assessment.overall_health_score === undefined
                    ? '—'
                    : `${Math.round(assessment.overall_health_score)}/100`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-content-secondary">Product quality score</dt>
                <dd className="font-bold tabular-nums text-content-primary">
                  {assessment.quality_score === null || assessment.quality_score === undefined
                    ? '—'
                    : `${Math.round(assessment.quality_score)}/100`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-content-secondary">Assessed</dt>
                <dd className="text-content-primary">{formatDateTime(assessment.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-content-secondary">Model</dt>
                <dd className="mono truncate text-content-secondary">
                  {assessment.model?.name} {assessment.model?.version}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {assessment.detected_indicators?.length > 0 && (
          <div className="mt-5 border-t border-edge-subtle pt-4">
            <p className="eyebrow">Visual indicators detected</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {assessment.detected_indicators.map((indicator, index) => (
                <li key={index} className="chip">
                  <Check className="h-3 w-3 shrink-0 text-[rgb(var(--accent-ink))]" aria-hidden="true" />
                  {indicator}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export { EnvTile };
