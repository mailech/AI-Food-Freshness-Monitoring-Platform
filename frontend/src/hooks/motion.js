/**
 * Motion utilities.
 *
 * Every effect here checks `useReducedMotion()` and degrades to a static
 * presentation, per the accessibility requirement. Tilt and parallax are also
 * disabled on touch/pointer-coarse devices where they cannot be driven and
 * would only cost frames.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** True when the user asked for reduced motion. Live-updating. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event) => setReduced(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/** True for touch-first devices, where hover-driven 3D makes no sense. */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const handler = (event) => setCoarse(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  return coarse;
}

/** Combined gate: should we run decorative 3D / parallax at all? */
export function useAllowMotion3D() {
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  return !reduced && !coarse;
}

/**
 * Mouse-follow 3D tilt, capped at `max` degrees (default 4 — §24 says 3–5).
 *
 * Writes CSS custom properties instead of React state so the pointer move never
 * triggers a re-render; the browser compositor does the work.
 *
 * Usage:
 *   const tilt = useTilt();
 *   <div ref={tilt.ref} {...tilt.handlers} className="tilt-3d">…</div>
 */
export function useTilt({ max = 4, enabled = true } = {}) {
  const ref = useRef(null);
  const allow = useAllowMotion3D() && enabled;
  const frame = useRef(0);

  const apply = useCallback((rotateX, rotateY) => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
    node.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
  }, []);

  const onPointerMove = useCallback(
    (event) => {
      if (!allow || !ref.current) return;
      // Coalesce to one update per frame.
      if (frame.current) return;
      const { clientX, clientY } = event;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width - 0.5;
        const py = (clientY - rect.top) / rect.height - 0.5;
        apply(-py * max * 2, px * max * 2);
      });
    },
    [allow, max, apply],
  );

  const onPointerLeave = useCallback(() => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    apply(0, 0);
  }, [apply]);

  useEffect(() => () => frame.current && cancelAnimationFrame(frame.current), []);

  return {
    ref,
    enabled: allow,
    handlers: allow ? { onPointerMove, onPointerLeave } : {},
  };
}

/**
 * Pointer parallax for hero visuals. Returns a normalised offset in [-1, 1].
 * Listens on the window so the effect works while the cursor is anywhere.
 */
export function usePointerParallax({ strength = 1, enabled = true } = {}) {
  const allow = useAllowMotion3D() && enabled;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frame = useRef(0);

  useEffect(() => {
    if (!allow) {
      setOffset({ x: 0, y: 0 });
      return undefined;
    }
    const handler = (event) => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const x = (event.clientX / window.innerWidth - 0.5) * 2 * strength;
        const y = (event.clientY / window.innerHeight - 0.5) * 2 * strength;
        setOffset({ x, y });
      });
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handler);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [allow, strength]);

  return offset;
}

/**
 * Animate a number from 0 to `value` with an ease-out curve.
 * Returns the target immediately when motion is reduced.
 */
export function useCountUp(value, { duration = 900, decimals = 0 } = {}) {
  const reduced = useReducedMotion();
  const target = Number.isFinite(Number(value)) ? Number(value) : 0;
  const [display, setDisplay] = useState(reduced ? target : 0);
  const frame = useRef(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(target);
      return undefined;
    }
    const start = performance.now();
    const origin = from.current;
    const delta = target - origin;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutExpo: fast settle, no bounce.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const next = origin + delta * eased;
      setDisplay(decimals > 0 ? Number(next.toFixed(decimals)) : Math.round(next));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };
    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
  }, [target, duration, decimals, reduced]);

  return display;
}

/** Reveal on scroll. Returns `[ref, visible]`; visible latches true once seen. */
export function useInView({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once]);

  return [ref, visible];
}

/** Staggered delay helper for list entrances. Capped so long lists stay snappy. */
export function stagger(index, step = 45, cap = 360) {
  return `${Math.min(index * step, cap)}ms`;
}
