/**
 * Formatting and status helpers.
 *
 * The status system pairs colour with an icon glyph and text label so the UI
 * remains readable for colour-blind users (accessibility requirement).
 */
import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Apple,
  Ban,
  Beef,
  Check,
  CheckCircle2,
  CircleDot,
  Croissant,
  Cylinder,
  Fish,
  HelpCircle,
  Info,
  Milk,
  Package,
  Recycle,
  RefreshCw,
  Search,
  Snowflake,
  UtensilsCrossed,
  Wheat,
  XCircle,
} from 'lucide-react';

// ------------------------------------------------------------------ dates
export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(String(value));
  return isValid(date) ? date : null;
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const date = toDate(value);
  return date ? format(date, pattern) : '—';
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy, HH:mm') : '—';
}

export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function daysUntilLabel(days) {
  if (days === null || days === undefined) return 'No date';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

// ----------------------------------------------------------------- numbers
export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatScore(value) {
  if (value === null || value === undefined) return '—';
  return `${Math.round(Number(value))}`;
}

export function formatPercent(value, { fromFraction = false, digits = 0 } = {}) {
  if (value === null || value === undefined) return '—';
  const pct = fromFraction ? Number(value) * 100 : Number(value);
  return `${pct.toFixed(digits)}%`;
}

export function formatQuantity(value, unit) {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value, Number(value) % 1 === 0 ? 0 : 2)} ${unit || ''}`.trim();
}

export function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatTemperature(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1)} °C`;
}

export function formatHumidity(value) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(0)}%`;
}

export function titleise(value) {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------- status system
/**
 * Freshness / inventory status presentation.
 * `icon` is a text glyph so colour is never the only signal.
 */
export const FRESHNESS_STATUS = {
  FRESH: {
    label: 'Fresh',
    icon: '✓',
    Icon: CheckCircle2,
    tone: 'positive',
    badge: 'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]',
    dot: 'bg-[rgb(var(--accent)/0.07)]0',
    text: 'text-[rgb(var(--accent-ink))] dark:text-leaf-400',
    chart: '#16a34a',
    description: 'No degradation observed.',
  },
  GOOD: {
    label: 'Good',
    icon: '✓',
    Icon: Check,
    tone: 'positive',
    badge: 'bg-[rgb(var(--accent)/0.07)] text-[rgb(var(--accent-ink))] dark:text-leaf-400 ring-[rgb(var(--accent)/0.22)]',
    dot: 'bg-leaf-500',
    text: 'text-[rgb(var(--accent-ink))] dark:text-leaf-400',
    chart: '#4ade80',
    description: 'Minor signs of ageing.',
  },
  ACCEPTABLE: {
    label: 'Acceptable',
    icon: '•',
    Icon: CircleDot,
    tone: 'neutral',
    badge: 'bg-surface-sunken text-content-secondary ring-edge',
    dot: 'bg-content-tertiary',
    text: 'text-content-secondary',
    chart: '#a8a29e',
    description: 'Usable but declining - monitor closely.',
  },
  NEAR_SPOILAGE: {
    label: 'Near Spoilage',
    icon: '!',
    Icon: AlertTriangle,
    tone: 'warning',
    badge: 'bg-amber-100/70 dark:bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-300/70 dark:ring-amber-400/25',
    dot: 'bg-amber-400 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-400',
    chart: '#f59e0b',
    description: 'Use or sell immediately.',
  },
  SPOILED: {
    label: 'Spoiled',
    icon: '✕',
    Icon: XCircle,
    tone: 'danger',
    badge: 'bg-rose-100/70 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-300/70 dark:ring-rose-400/25',
    dot: 'bg-rose-500 dark:bg-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    chart: '#e11d48',
    description: 'Remove from stock.',
  },
  EXPIRED: {
    label: 'Expired',
    icon: '✕',
    Icon: Ban,
    tone: 'danger',
    badge: 'bg-rose-100/70 dark:bg-rose-500/12 text-rose-800 dark:text-rose-200 ring-rose-400/70 dark:ring-rose-400/35',
    dot: 'bg-rose-700',
    text: 'text-rose-700 dark:text-rose-300',
    chart: '#9f1239',
    description: 'Past its best-before date.',
  },
};

const FALLBACK_STATUS = {
  label: 'Unknown',
  icon: '?',
  Icon: HelpCircle,
  tone: 'neutral',
  badge: 'bg-surface-sunken text-content-secondary ring-edge',
  dot: 'bg-edge',
  text: 'text-content-secondary',
  chart: '#d6d3d1',
  description: 'Not assessed yet.',
};

export function statusMeta(value) {
  if (!value) return FALLBACK_STATUS;
  return FRESHNESS_STATUS[String(value).toUpperCase()] || FALLBACK_STATUS;
}

export const SEVERITY_META = {
  INFO: {
    label: 'Info', icon: 'i', Icon: Info,
    badge: 'bg-chill-100/70 text-chill-700 dark:text-chill-300 dark:text-chill-200 ring-chill-300/60 dark:bg-chill-50 dark:bg-chill-500/80/12 dark:text-chill-200 dark:ring-chill-400/25',
    chart: '#32bef8',
  },
  LOW: {
    label: 'Low', icon: '•', Icon: CircleDot,
    badge: 'bg-surface-sunken text-content-secondary ring-edge',
    chart: '#88887f',
  },
  MEDIUM: {
    label: 'Medium', icon: '!', Icon: AlertTriangle,
    badge: 'bg-amber-100/70 text-amber-800 ring-amber-300/60 dark:bg-amber-500/12 dark:text-amber-200 dark:ring-amber-400/25',
    chart: '#f5b229',
  },
  HIGH: {
    label: 'High', icon: '!!', Icon: AlertCircle,
    badge: 'bg-amber-200/70 text-amber-900 ring-amber-400/60 dark:bg-amber-500/18 dark:text-amber-100 dark:ring-amber-400/35',
    chart: '#e9910f',
  },
  CRITICAL: {
    label: 'Critical', icon: '✕', Icon: AlertOctagon,
    badge: 'bg-rose-100/80 text-rose-800 ring-rose-300/70 dark:bg-rose-500/14 dark:text-rose-200 dark:ring-rose-400/30',
    chart: '#e3554c',
  },
};

export function severityMeta(value) {
  return SEVERITY_META[String(value || 'INFO').toUpperCase()] || SEVERITY_META.INFO;
}

export const RISK_META = {
  LOW: { label: 'Low risk', badge: 'bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]' },
  MEDIUM: { label: 'Medium risk', badge: 'bg-amber-100/70 dark:bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-300/70 dark:ring-amber-400/25' },
  HIGH: { label: 'High risk', badge: 'bg-amber-200/70 dark:bg-amber-500/18 text-amber-800 dark:text-amber-200 ring-amber-400/70 dark:ring-amber-400/35' },
  CRITICAL: { label: 'Critical risk', badge: 'bg-rose-100/70 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-300/70 dark:ring-rose-400/25' },
};

export function riskMeta(value) {
  return RISK_META[String(value || 'LOW').toUpperCase()] || RISK_META.LOW;
}

export const COMPLIANCE_META = {
  COMPLIANT: {
    label: 'Compliant', icon: '✓', Icon: CheckCircle2,
    badge: 'bg-[rgb(var(--accent)/0.12)]/80 text-[rgb(var(--accent-ink))] ring-[rgb(var(--accent)/0.3)]/70 dark:bg-[rgb(var(--accent)/0.07)]0/14 dark:text-leaf-200 dark:ring-leaf-400/30',
    chart: '#128756',
  },
  WARNING: {
    label: 'Warning', icon: '!', Icon: AlertTriangle,
    badge: 'bg-amber-100/80 text-amber-800 ring-amber-300/70 dark:bg-amber-500/14 dark:text-amber-200 dark:ring-amber-400/30',
    chart: '#f5b229',
  },
  NON_COMPLIANT: {
    label: 'Non-compliant', icon: '✕', Icon: XCircle,
    badge: 'bg-rose-100/80 text-rose-800 ring-rose-300/70 dark:bg-rose-500/14 dark:text-rose-200 dark:ring-rose-400/30',
    chart: '#e3554c',
  },
  UNKNOWN: {
    label: 'Not recorded', icon: '?', Icon: HelpCircle,
    badge: 'bg-surface-sunken text-content-tertiary ring-edge-subtle',
    chart: '#b0b0aa',
  },
};

export function complianceMeta(value) {
  return COMPLIANCE_META[String(value || 'UNKNOWN').toUpperCase()] || COMPLIANCE_META.UNKNOWN;
}

export const PRIORITY_META = {
  URGENT: { label: 'Urgent', badge: 'bg-rose-100/80 text-rose-800 ring-rose-300/70 dark:bg-rose-500/14 dark:text-rose-200 dark:ring-rose-400/30' },
  HIGH: { label: 'High', badge: 'bg-amber-100/80 text-amber-800 ring-amber-300/70 dark:bg-amber-500/14 dark:text-amber-200 dark:ring-amber-400/30' },
  MEDIUM: { label: 'Medium', badge: 'bg-chill-100/70 text-chill-700 dark:text-chill-300 dark:text-chill-200 ring-chill-300/60 dark:bg-chill-50 dark:bg-chill-500/80/12 dark:text-chill-200 dark:ring-chill-400/25' },
  LOW: { label: 'Low', badge: 'bg-surface-sunken text-content-secondary ring-edge' },
};

export function priorityMeta(value) {
  return PRIORITY_META[String(value || 'MEDIUM').toUpperCase()] || PRIORITY_META.MEDIUM;
}

export const RECOMMENDATION_META = {
  STORAGE: {
    label: 'Storage', icon: '❄', Icon: Snowflake,
    accent: 'text-chill-700 dark:text-chill-300 bg-chill-50 dark:bg-chill-500/8 ring-chill-300/60 dark:ring-chill-400/22/70 dark:text-chill-200 dark:bg-chill-50 dark:bg-chill-500/80/12 dark:ring-chill-400/25',
  },
  CONSUMPTION: {
    label: 'Consumption', icon: '🍽', Icon: UtensilsCrossed,
    accent: 'text-[rgb(var(--accent-ink))] dark:text-leaf-400 bg-[rgb(var(--accent)/0.07)] ring-[rgb(var(--accent)/0.22)]/70 dark:text-leaf-300 dark:bg-[rgb(var(--accent)/0.07)]0/12 dark:ring-leaf-400/25',
  },
  INVENTORY_ROTATION: {
    label: 'Rotation', icon: '⟳', Icon: RefreshCw,
    accent: 'text-content-secondary bg-surface-sunken ring-edge',
  },
  WASTE_REDUCTION: {
    label: 'Waste reduction', icon: '♻', Icon: Recycle,
    accent: 'text-amber-800 bg-amber-50 ring-amber-200/70 dark:text-amber-200 dark:bg-amber-500/12 dark:ring-amber-400/25',
  },
  QUALITY_IMPROVEMENT: {
    label: 'Quality', icon: '🔍', Icon: Search,
    accent: 'text-rose-700 bg-rose-50 ring-rose-200/70 dark:text-rose-200 dark:bg-rose-500/12 dark:ring-rose-400/25',
  },
};

export function recommendationMeta(value) {
  return (
    RECOMMENDATION_META[String(value || '').toUpperCase()] || {
      label: titleise(value),
      icon: '•',
      Icon: CircleDot,
      accent: 'text-content-secondary bg-surface-sunken ring-edge',
    }
  );
}

/** Score -> colour for gauges and score rings. */
export function scoreColor(score) {
  if (score === null || score === undefined) return '#b0b0aa';
  if (score >= 90) return '#128756';  // leaf-600
  if (score >= 75) return '#20a76b';  // leaf-500
  if (score >= 60) return '#88887f';  // char-400
  if (score >= 30) return '#f5b229';  // amber-400
  return '#e3554c';                   // rose-500
}

export function scoreBand(score) {
  if (score === null || score === undefined) return 'UNKNOWN';
  if (score >= 90) return 'FRESH';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'ACCEPTABLE';
  if (score >= 30) return 'NEAR_SPOILAGE';
  return 'SPOILED';
}

/** Lucide component per category, for surfaces that want a vector icon. */
export const CATEGORY_ICON_COMPONENTS = {
  FRUITS: Apple,
  VEGETABLES: Wheat,
  DAIRY: Milk,
  MEAT_POULTRY: Beef,
  SEAFOOD: Fish,
  BAKERY: Croissant,
  PACKAGED: Package,
  BEVERAGES: Cylinder,
  GENERIC: UtensilsCrossed,
};

export function categoryIconComponent(slug) {
  return (
    CATEGORY_ICON_COMPONENTS[String(slug || '').toUpperCase()] ||
    CATEGORY_ICON_COMPONENTS.GENERIC
  );
}

export const CATEGORY_ICONS = {
  FRUITS: '🍎',
  VEGETABLES: '🥕',
  DAIRY: '🥛',
  MEAT_POULTRY: '🍗',
  SEAFOOD: '🐟',
  BAKERY: '🥐',
  PACKAGED: '📦',
  BEVERAGES: '🥤',
  GENERIC: '🍽',
};

export function categoryIcon(slug) {
  return CATEGORY_ICONS[String(slug || '').toUpperCase()] || CATEGORY_ICONS.GENERIC;
}

/** Clamp a value into [min, max]. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function truncate(text, length = 120) {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
