/** Reusable data-fetching and UI hooks. */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Declarative async fetch with loading/error/refetch.
 *
 * `deps` behaves like a useEffect dependency list. In-flight results from a
 * superseded render are discarded so fast filter changes cannot show stale data.
 */
export function useAsync(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher(...args);
        if (mounted.current && id === requestId.current) {
          setData(result);
          return result;
        }
        return result;
      } catch (err) {
        if (mounted.current && id === requestId.current) setError(err);
        throw err;
      } finally {
        if (mounted.current && id === requestId.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    if (!immediate) return;
    run().catch(() => {
      /* error state is already set */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run, setData };
}

/** Debounce a rapidly changing value (search inputs). */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Paginated list state: page, page size and total pages. */
export function usePagination(initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1, has_next: false, has_prev: false });

  const reset = useCallback(() => setPage(1), []);

  return {
    page,
    pageSize,
    meta,
    setPage,
    setPageSize: (size) => {
      setPageSize(size);
      setPage(1);
    },
    setMeta,
    reset,
    next: () => setPage((p) => (meta.has_next ? p + 1 : p)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
  };
}

/** Persist a value in localStorage. */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [key, value]);

  return [value, setValue];
}

/** Close on Escape / outside click - used by dropdowns and modals. */
export function useDismiss(ref, onDismiss, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onDismiss();
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, onDismiss, active]);
}

/** Poll a fetcher on an interval (notification badge, health). */
export function usePolling(fetcher, intervalMs = 60000, enabled = true) {
  const [data, setData] = useState(null);
  const timer = useRef(null);

  const tick = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
    } catch {
      /* polling failures are non-fatal */
    }
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return undefined;
    tick();
    timer.current = setInterval(tick, intervalMs);
    return () => clearInterval(timer.current);
  }, [tick, intervalMs, enabled]);

  return { data, refresh: tick };
}

/** Set the document title. */
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · Freshness Platform` : 'Freshness Platform';
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/** Track a media query (responsive behaviour in JS). */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    list.addEventListener('change', handler);
    setMatches(list.matches);
    return () => list.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
