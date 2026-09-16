/**
 * Platform metadata context.
 *
 * Loads `/api/v1/meta` once so dropdown options, category profiles, scoring
 * weights/thresholds and the AI honesty label come from the backend rather than
 * being duplicated (and drifting) in the frontend.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { systemApi } from '../services';

const MetaContext = createContext(null);

const FALLBACK = {
  app_name: 'AI Food Freshness Monitoring Platform',
  demo_mode: true,
  environment: 'development',
  analysis_label: 'Demo AI Analysis (baseline)',
  scoring: {
    weights: { visual: 0.4, storage: 0.25, shelf_life: 0.2, product_age: 0.15 },
    thresholds: { FRESH: 90, GOOD: 75, ACCEPTABLE: 60, NEAR_SPOILAGE: 30 },
  },
  enums: {},
  categories: [],
  upload: { max_mb: 10, allowed_extensions: ['.jpg', '.jpeg', '.png'] },
  disclaimer:
    'Freshness and shelf-life outputs are AI estimates, not laboratory measurements or food-safety guarantees.',
};

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(FALLBACK);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [metaPayload, healthPayload] = await Promise.all([
          systemApi.meta(),
          systemApi.health().catch(() => null),
        ]);
        if (cancelled) return;
        setMeta({ ...FALLBACK, ...metaPayload });
        setHealth(healthPayload);
        setUnreachable(false);
      } catch {
        if (!cancelled) setUnreachable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const enums = meta.enums || {};
    const options = (key) => enums[key] || [];
    const categoryBySlug = Object.fromEntries(
      (meta.categories || []).map((category) => [category.slug, category]),
    );

    return {
      meta,
      health,
      loading,
      unreachable,
      demoMode: Boolean(meta.demo_mode),
      environment: meta.environment || 'development',
      isProduction: (meta.environment || 'development') === 'production',
      analysisLabel: meta.analysis_label,
      disclaimer: meta.disclaimer,
      weights: meta.scoring?.weights || FALLBACK.scoring.weights,
      thresholds: meta.scoring?.thresholds || FALLBACK.scoring.thresholds,
      upload: meta.upload || FALLBACK.upload,
      categories: meta.categories || [],
      categoryBySlug,
      options,
      packagingOptions: options('packaging_types'),
      airCirculationOptions: options('air_circulation'),
      lightExposureOptions: options('light_exposure'),
      freshnessOptions: options('freshness_categories'),
      statusOptions: options('inventory_statuses'),
      alertTypeOptions: options('alert_types'),
      severityOptions: options('alert_severities'),
      reportTypeOptions: options('report_types'),
      reportFormatOptions: options('report_formats'),
      roleOptions: options('roles'),
      rotationOptions: options('rotation_strategies'),
    };
  }, [meta, health, loading, unreachable]);

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export function useMeta() {
  const context = useContext(MetaContext);
  if (!context) throw new Error('useMeta must be used inside a MetaProvider');
  return context;
}
