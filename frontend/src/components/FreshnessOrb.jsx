/**
 * FreshnessOrb — the hero visual.
 *
 * Progressive enhancement in three tiers:
 *
 *   1. reduced-motion / touch / small screen  -> pure CSS orb (no three.js at all)
 *   2. capable client                          -> lazy-loaded R3F scene
 *   3. WebGL unavailable or the chunk fails    -> falls back to tier 1
 *
 * The score, band and label always render as real DOM text, so the information
 * is present regardless of which tier is active — the 3D is decoration layered
 * on top of an accessible readout, never a replacement for it.
 */
import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Activity, ScanLine } from 'lucide-react';
import { scoreColor, statusMeta } from '../utils/format';
import { useAllowMotion3D, usePointerParallax } from '../hooks/motion';

const OrbScene = lazy(() => import('./three/OrbScene'));

/** True when the browser can give us a WebGL context at all. */
function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

/** Tier-1 fallback: concentric rings + orbiting dots, entirely in CSS. */
function CssOrb({ color, animate }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div
        className="absolute h-[62%] w-[62%] rounded-full blur-2xl"
        style={{ backgroundColor: color, opacity: 0.22 }}
      />
      <div
        className="absolute h-[54%] w-[54%] rounded-full border"
        style={{ borderColor: `${color}55` }}
      />
      <div
        className={clsx(
          'absolute h-[70%] w-[70%] rounded-full border border-dashed',
          animate && 'motion-safe-only animate-[spin_30s_linear_infinite]',
        )}
        style={{ borderColor: `${color}33` }}
      />
      <div
        className={clsx(
          'absolute h-[86%] w-[86%] rounded-full border',
          animate && 'motion-safe-only animate-[spin_46s_linear_infinite_reverse]',
        )}
        style={{ borderColor: `${color}1f` }}
      >
        {/* Orbiting nodes pinned to the rotating ring. */}
        {[0, 72, 144, 216, 288].map((deg) => (
          <span
            key={deg}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: color,
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(calc(50% * 1.72)) translateY(-50%)`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>
      <div
        className="absolute h-[40%] w-[40%] rounded-full"
        style={{
          background: `radial-gradient(circle at 34% 30%, ${color}dd, ${color}44 60%, transparent 72%)`,
        }}
      />
    </div>
  );
}

export default function FreshnessOrb({
  score,
  category,
  label = 'Freshness index',
  sublabel,
  className,
  size = 'md',
  showReadout = true,
}) {
  const allow3D = useAllowMotion3D();
  const [webgl, setWebgl] = useState(false);
  const [failed, setFailed] = useState(false);
  const parallax = usePointerParallax({ strength: 1 });
  const pointer = useRef({ x: 0, y: 0 });

  // Feed parallax into a ref so the 3D scene never triggers React renders.
  pointer.current = parallax;

  useEffect(() => setWebgl(detectWebGL()), []);

  const meta = statusMeta(category);
  const colour = scoreColor(score);
  const use3D = allow3D && webgl && !failed;

  const sizes = {
    sm: 'h-48 w-48',
    md: 'h-64 w-64 sm:h-72 sm:w-72',
    lg: 'h-72 w-72 sm:h-80 sm:w-80 lg:h-[22rem] lg:w-[22rem]',
  };

  return (
    <div className={clsx('relative flex flex-col items-center', className)}>
      <div className={clsx('relative', sizes[size] || sizes.md)}>
        {use3D ? (
          <Suspense fallback={<CssOrb color={colour} animate />}>
            <ErrorBoundary onError={() => setFailed(true)} fallback={<CssOrb color={colour} animate />}>
              <OrbScene color={colour} pointer={pointer} />
            </ErrorBoundary>
          </Suspense>
        ) : (
          <CssOrb color={colour} animate={allow3D} />
        )}

        {/* Accessible readout sits above whichever visual tier is active. */}
        {showReadout && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="eyebrow mb-1 text-content-tertiary">{label}</span>
            <span className="metric text-5xl leading-none sm:text-6xl" style={{ color: colour }}>
              {score === null || score === undefined ? '—' : Math.round(score)}
            </span>
            {category && (
              <span
                className={clsx('badge mt-2.5', meta.badge)}
                style={{ backdropFilter: 'blur(6px)' }}
              >
                {meta.Icon && <meta.Icon className="h-3 w-3" aria-hidden="true" />}
                {meta.label}
              </span>
            )}
          </div>
        )}
      </div>

      {sublabel && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-content-tertiary">
          {use3D ? (
            <ScanLine className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Activity className="h-3 w-3" aria-hidden="true" />
          )}
          {sublabel}
        </p>
      )}
    </div>
  );
}

/* Minimal boundary: a failed WebGL chunk must never blank the dashboard. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export { CssOrb };
