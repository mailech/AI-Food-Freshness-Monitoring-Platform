/**
 * DashboardHero — the first thing every role sees.
 *
 * Layered composition: organic blooms, a faint scan grid, the greeting and
 * primary action on the left, and the 3D freshness orb on the right. The orb is
 * progressively enhanced (see FreshnessOrb) so this section is never blocked on
 * WebGL or a 600 KB chunk.
 *
 * The headline figure is real data — the inventory-wide average freshness score
 * from the API — never a decorative number.
 */
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ScanLine, Sparkles, TrendingUp } from 'lucide-react';
import FreshnessOrb from './FreshnessOrb';
import { AIBadge, Button } from './ui';
import { formatDate, scoreBand, statusMeta } from '../utils/format';

/** Time-of-day greeting. */
function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default function DashboardHero({
  name,
  roleLabel,
  score,
  scoreLabel = 'Average freshness',
  headline,
  subheadline,
  stats = [],
  primaryAction,
  secondaryAction,
  className,
}) {
  const band = scoreBand(score);
  const meta = statusMeta(band);
  const today = new Date();

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-edge-subtle',
        'bg-surface-raised/60 backdrop-blur-sm',
        className,
      )}
    >
      {/* ---- ambient layers ---- */}
      <span
        aria-hidden="true"
        className="bloom motion-safe-only -left-24 -top-32 h-80 w-80 animate-drift-slow"
        style={{ backgroundColor: 'rgb(var(--accent)/0.16)' }}
      />
      <span
        aria-hidden="true"
        className="bloom motion-safe-only -bottom-40 right-10 h-72 w-72 animate-drift-slow [animation-delay:-9s]"
        style={{ backgroundColor: 'rgb(52 160 145 / 0.14)' }}
      />
      <span
        aria-hidden="true"
        className="scan-grid pointer-events-none absolute inset-0 opacity-[0.35] mask-fade-b"
      />

      <div className="relative grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr,1fr] lg:p-10">
        {/* ---------------------------------------------------- copy side */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AIBadge title="Freshness figures on this page are AI estimates">AI</AIBadge>
            <p className="eyebrow">
              {roleLabel} · {formatDate(today, 'EEEE d MMMM')}
            </p>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold leading-[1.08] tracking-tight text-content-primary sm:text-4xl lg:text-5xl">
            {greetingFor(today)},{' '}
            <span className="text-gradient-leaf">{name}</span>
          </h1>

          <p className="mt-3 max-w-xl text-balance text-base leading-relaxed text-content-secondary">
            {headline || 'Your food intelligence overview.'}
          </p>
          {subheadline && (
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-content-tertiary">
              {subheadline}
            </p>
          )}

          {/* ---- inline key figures (real API data) ---- */}
          {stats.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="eyebrow">{stat.label}</dt>
                  <dd className="metric mt-1 flex items-baseline gap-1.5 text-2xl">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-sm font-medium text-content-tertiary">{stat.suffix}</span>
                    )}
                    {stat.trend && (
                      <span
                        className={clsx(
                          'ml-1 inline-flex items-center gap-0.5 text-xs font-bold',
                          stat.trend.direction === 'up'
                            ? 'text-[rgb(var(--accent-ink))] dark:text-leaf-400'
                            : stat.trend.direction === 'down'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-content-tertiary',
                        )}
                      >
                        <TrendingUp
                          className={clsx('h-3 w-3', stat.trend.direction === 'down' && 'rotate-180')}
                          aria-hidden="true"
                        />
                        {stat.trend.label}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent)/0.08)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--accent-ink))]">
              <Sparkles className="h-3 w-3" />
              Weighted Model: 40% Visual · 25% Storage · 20% Shelf-Life · 15% Age
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {primaryAction || (
              <Link to="/analyze">
                <Button size="lg" icon={<ScanLine />}>
                  Analyse Food
                </Button>
              </Link>
            )}
            {secondaryAction}
          </div>
        </div>

        {/* ----------------------------------------------------- orb side */}
        <div className="relative flex items-center justify-center lg:justify-end">
          <FreshnessOrb
            score={score}
            category={band}
            label={scoreLabel}
            sublabel={
              score === null || score === undefined
                ? 'No assessments yet'
                : `${meta.label} · across assessed inventory`
            }
            size="lg"
          />
        </div>
      </div>
    </section>
  );
}

export { greetingFor };
