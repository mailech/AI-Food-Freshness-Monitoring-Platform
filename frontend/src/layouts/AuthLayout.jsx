/**
 * Split layout used by the login and registration screens.
 *
 * The left column is the product's first impression: a dark, depth-layered
 * panel with the 3D freshness orb, a mesh-gradient bloom and the capability
 * list. The orb is the same progressively-enhanced component used on the
 * dashboards, so it degrades to CSS on low-power devices and disappears
 * entirely under `prefers-reduced-motion`.
 */
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Leaf, Recycle, ScanLine, Snowflake, Sparkles } from 'lucide-react';

import { useMeta } from '../context/MetaContext';
import { InlineNotice } from '../components/ui';
import FreshnessOrb from '../components/FreshnessOrb';
import { useAllowMotion3D } from '../hooks/motion';

const HIGHLIGHTS = [
  {
    Icon: ScanLine,
    title: 'Image-based freshness assessment',
    body: 'Colour and texture analysis produces a 0–100 freshness score with the reasoning shown.',
  },
  {
    Icon: Clock,
    title: 'Shelf-life prediction',
    body: 'Remaining days and a predicted expiry date from storage conditions, packaging and age.',
  },
  {
    Icon: Snowflake,
    title: 'Storage compliance',
    body: 'Temperature and humidity tracked against per-category ranges, with alerts on violations.',
  },
  {
    Icon: Recycle,
    title: 'Waste reduction',
    body: 'FIFO/FEFO rotation, markdown suggestions and value-at-risk reporting.',
  },
];

/** Word mark, reused in the panel and the mobile header. */
function Wordmark({ tone = 'dark' }) {
  const light = tone === 'light';
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={
          light
            ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--accent))] text-white shadow-glow-leaf'
            : 'flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-leaf-100 ring-1 ring-inset ring-white/15 backdrop-blur'
        }
      >
        <Leaf className={light ? 'h-5 w-5' : 'h-[22px] w-[22px]'} strokeWidth={2} />
      </span>
      <div>
        <p
          className={
            light
              ? 'text-sm font-semibold text-content-primary'
              : 'text-base font-semibold tracking-tight text-white'
          }
        >
          Freshness Platform
        </p>
        <p className={light ? 'text-xs text-content-tertiary' : 'text-xs text-leaf-200/80'}>
          AI food quality monitoring
        </p>
      </div>
    </div>
  );
}

export default function AuthLayout() {
  const { unreachable, demoMode } = useMeta();
  const allow3D = useAllowMotion3D();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ------------------------------------------------ brand / hero panel */}
      <div className="relative hidden overflow-hidden bg-char-1000 px-10 py-12 lg:flex lg:w-[48%] lg:flex-col lg:justify-between">
        {/* depth: two blurred blooms + a faint scan grid + a hairline edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-28 h-[26rem] w-[26rem] rounded-full
            bg-[radial-gradient(circle,rgb(32_167_107/0.55),transparent_65%)] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -left-24 h-[28rem] w-[28rem] rounded-full
            bg-[radial-gradient(circle,rgb(245_178_41/0.22),transparent_65%)] blur-2xl"
        />
        <div aria-hidden="true" className="scan-grid pointer-events-none absolute inset-0 opacity-[0.14]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b
            from-transparent via-white/12 to-transparent"
        />

        <div className="relative">
          <Wordmark />

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 max-w-md text-balance text-[2rem] font-semibold leading-[1.15] tracking-tight text-white"
          >
            Know how fresh your food really is —{' '}
            <span className="text-gradient-leaf">and how long it has left.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 max-w-md text-sm leading-relaxed text-leaf-100/70"
          >
            Upload a photo, record the storage conditions, and get an explainable freshness score,
            spoilage indicators, a shelf-life estimate and concrete actions to reduce waste.
          </motion.p>

          <ul className="mt-9 space-y-3.5">
            {HIGHLIGHTS.map((item, i) => (
              <motion.li
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.16 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-3.5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-xl
                    bg-white/[0.07] text-leaf-200 ring-1 ring-inset ring-white/10"
                >
                  <item.Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-medium text-white/95">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-leaf-100/55">{item.body}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* the orb sits behind the honesty note, anchored bottom-right */}
        {allow3D && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 right-2 hidden opacity-70 xl:block"
          >
            <FreshnessOrb score={92} category="FRESH" size="sm" showReadout={false} />
          </div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="relative mt-10 max-w-md rounded-2xl bg-white/[0.05] p-4 text-xs
            leading-relaxed text-leaf-100/65 ring-1 ring-inset ring-white/10 backdrop-blur"
        >
          <span className="mb-1.5 flex items-center gap-1.5 font-semibold text-white/90">
            <Sparkles className="h-3.5 w-3.5 text-leaf-300" aria-hidden="true" />
            On AI honesty
          </span>
          When no trained model artefact is installed the platform uses transparent computer-vision
          baselines and labels every result accordingly. No accuracy figures are claimed for them.
        </motion.p>
      </div>

      {/* ---------------------------------------------------- form column */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-6 lg:hidden">
            <Wordmark tone="light" />
          </div>

          {unreachable && (
            <InlineNotice tone="danger" title="API unreachable" className="mb-4">
              The backend could not be reached. Start it with{' '}
              <code className="rounded bg-surface-sunken px-1 font-mono text-2xs">
                uvicorn app.main:app --reload
              </code>{' '}
              from the <code className="font-mono text-2xs">backend/</code> directory.
            </InlineNotice>
          )}

          {demoMode && !unreachable && (
            <InlineNotice tone="warning" title="Demo mode" className="mb-4">
              This deployment runs baseline (non-trained) AI components. Results are labelled as
              demo estimates throughout the interface.
            </InlineNotice>
          )}

          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
