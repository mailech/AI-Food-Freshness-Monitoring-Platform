/**
 * Theme context — light / dark / system, persisted.
 *
 * The attribute is written to <html data-theme="..."> so CSS variables in
 * index.css swap wholesale. Light and dark are separately designed palettes,
 * not an inversion.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'ffm.theme';

/** 'light' | 'dark' | 'system' */
function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Track the OS setting so 'system' stays live.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => setSystemDark(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    // Keep the browser UI (mobile address bar) in step with the surface colour.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0e1210' : '#faf9f5');
  }, [resolved]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* private mode: the choice simply will not persist */
    }
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((current) =>
      current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light',
    );
  }, []);

  const value = useMemo(
    () => ({
      preference,
      theme: resolved,
      isDark: resolved === 'dark',
      setTheme: setPreference,
      cycle,
    }),
    [preference, resolved, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}
