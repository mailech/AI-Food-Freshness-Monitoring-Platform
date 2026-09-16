/**
 * Render smoke tests for the redesigned UI.
 *
 * A production build does not fail on an undefined JSX component or a bad prop
 * access — those only surface at runtime. These tests mount every premium
 * surface with realistic API-shaped data and assert it renders, so a regression
 * is caught by `npm run test` rather than by a blank page in the browser.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import DashboardHero, { greetingFor } from '../components/DashboardHero';
import FreshnessOrb from '../components/FreshnessOrb';
import {
  AIBadge,
  Badge,
  ComplianceBadge,
  DataList,
  DemoBadge,
  GlassCard,
  IconPlate,
  InlineNotice,
  PriorityBadge,
  ProgressSteps,
  RiskBadge,
  SectionHeader,
  SeverityBadge,
  Skeleton,
  SkeletonChart,
  SkeletonTable,
  Sparkline,
  StatCard,
  Tabs,
  Tilt3D,
} from '../components/ui';
import {
  AIAnalysisPanel,
  AlertCard,
  AssessmentSummary,
  FoodCard,
  IndicatorList,
  RecommendationCard,
  ScanningOverlay,
  ShelfLifeCard,
  ShelfLifeTimeline,
  StorageSnapshotCard,
} from '../components/domain';

// The image endpoint needs a bearer token, so ProtectedImage fetches a blob.
vi.mock('../services/apiClient', () => ({
  fetchImageObjectUrl: vi.fn().mockResolvedValue('blob:test'),
  api: { get: vi.fn(), post: vi.fn() },
}));

function wrap(ui) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/* -------------------------------------------------------------- fixtures */
const batch = {
  id: 7,
  batch_number: 'BTCH-20260915-0007',
  quantity: 12.5,
  unit: 'kg',
  status: 'GOOD',
  current_freshness_score: 81.4,
  current_freshness_category: 'GOOD',
  remaining_shelf_life_days: 4.2,
  days_until_expiry: 5,
  storage_location: 'Cold Room A',
  product: { name: 'Alphonso Mango', category_slug: 'FRUITS', category_name: 'Fruits' },
};

const assessment = {
  id: 3,
  batch_id: 7,
  freshness_score: 80.8,
  freshness_category: 'GOOD',
  confidence: 0.91,
  spoilage_probability: 0.08,
  overall_health_score: 77,
  processing_ms: 54,
  created_at: '2026-09-15T10:00:00Z',
  components: { visual: 82, storage: 74, shelf_life: 80, product_age: 90 },
  weights_used: { visual: 0.4, storage: 0.25, shelf_life: 0.2, product_age: 0.15 },
  detected_indicators: ['Normal colour distribution', 'No visible mould detected'],
  model: { name: 'baseline-cv-freshness', version: '1.2.0', is_demo: true, label: 'Demo AI Analysis (baseline)' },
  indicators: [
    {
      indicator_type: 'MOLD',
      label: 'Possible mould growth',
      severity: 'LOW',
      confidence: 0.11,
      affected_area_ratio: 0.004,
      detected: false,
      description: 'No mould-like clusters were isolated.',
      detector: 'opencv-spoilage-baseline',
    },
    {
      indicator_type: 'DISCOLORATION',
      label: 'Discoloration / browning',
      severity: 'MEDIUM',
      confidence: 0.62,
      affected_area_ratio: 0.14,
      detected: true,
      description: 'Brown pixels account for 14% of the food region.',
      detector: 'opencv-spoilage-baseline',
    },
  ],
};

const shelfLife = {
  remaining_shelf_life_days: 4.2,
  predicted_expiry_date: '2026-09-19',
  lower_bound_days: 2.9,
  upper_bound_days: 5.6,
  confidence: 0.68,
  risk_level: 'MEDIUM',
  explanation: 'Baseline prediction: Fruits starts from 7 days at ideal storage.',
  factors: { temperature_factor: 0.82, humidity_factor: 1, packaging_factor: 1.1 },
  model: { is_demo: true, label: 'Baseline prediction' },
};

const snapshot = {
  batch_id: 7,
  batch_number: 'BTCH-20260915-0007',
  location_name: 'Cold Room A',
  compliance_status: 'WARNING',
  risk_level: 'MEDIUM',
  storage_score: 87,
  storage_duration_days: 3,
  current: { temperature_c: 9.4, humidity_pct: 93, air_circulation: 'POOR', light_exposure: 'LOW' },
  required: { temp_min_c: 2, temp_max_c: 8, humidity_min_pct: 85, humidity_max_pct: 95 },
  violations: [
    { parameter: 'temperature', status: 'WARNING', message: 'Temperature 9.4 C exceeds the 8 C maximum.' },
  ],
  recommendation: 'Move this batch to a cooler area.',
  disclaimer: 'Recommended ranges are configurable engineering defaults.',
};

const alert = {
  id: 11,
  alert_type: 'TEMPERATURE_VIOLATION',
  severity: 'HIGH',
  title: 'Temperature out of range - Alphonso Mango',
  message: 'Temperature 9.4 C exceeds the recommended maximum of 8 C.',
  is_read: false,
  resolved: false,
  created_at: '2026-09-15T09:30:00Z',
  batch_id: 7,
  batch_number: 'BTCH-20260915-0007',
};

const recommendation = {
  id: 21,
  batch_id: 7,
  recommendation_type: 'STORAGE',
  priority: 'HIGH',
  title: 'Move this batch to a cooler storage area',
  message: 'Move batch BTCH-20260915-0007 to a cooler area.',
  rationale: 'Temperature 9.4 C exceeds the 8 C maximum by 1.4 C.',
  rule_id: 'STORAGE_TEMP_ABOVE_MAX',
  expected_impact: 'Removing the excursion can recover several days of shelf life.',
  acknowledged: false,
};

/* ==================================================================== hero */
describe('DashboardHero', () => {
  it('greets by time of day and shows the real score', () => {
    wrap(
      <DashboardHero
        name="Asha"
        roleLabel="Consumer"
        score={81.4}
        headline="Your food intelligence overview."
        stats={[{ label: 'Items tracked', value: 44 }]}
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Your food intelligence overview.')).toBeInTheDocument();
    expect(screen.getByText('Items tracked')).toBeInTheDocument();
    // The score must be the API value, never a decorative number.
    expect(screen.getByText('81')).toBeInTheDocument();
  });

  it('handles a missing score without crashing', () => {
    wrap(<DashboardHero name="Sam" roleLabel="Admin" score={null} />);
    expect(screen.getByText('No assessments yet')).toBeInTheDocument();
  });

  it('picks the right greeting for each part of the day', () => {
    expect(greetingFor(new Date('2026-09-15T08:00:00'))).toBe('Good morning');
    expect(greetingFor(new Date('2026-09-15T14:00:00'))).toBe('Good afternoon');
    expect(greetingFor(new Date('2026-09-15T19:00:00'))).toBe('Good evening');
    expect(greetingFor(new Date('2026-09-15T02:00:00'))).toBe('Good night');
  });
});

describe('FreshnessOrb', () => {
  it('renders the CSS tier with an accessible readout when WebGL is absent', () => {
    // jsdom has no WebGL, so the component must fall back, not throw.
    wrap(<FreshnessOrb score={64} category="ACCEPTABLE" label="Average freshness" />);
    expect(screen.getByText('64')).toBeInTheDocument();
    expect(screen.getByText('Average freshness')).toBeInTheDocument();
    expect(screen.getByText('Acceptable')).toBeInTheDocument();
  });
});

/* ================================================================== cards */
describe('StatCard', () => {
  it('renders label, value, trend and sublabel', () => {
    wrap(
      <StatCard
        label="Total inventory"
        value={128}
        sublabel="across 8 categories"
        trend={{ direction: 'up', label: '+12.4%' }}
        spark={[10, 14, 12, 20, 24, 22, 30]}
        tone="positive"
      />,
    );
    expect(screen.getByText('Total inventory')).toBeInTheDocument();
    expect(screen.getByText('+12.4%')).toBeInTheDocument();
    expect(screen.getByText('across 8 categories')).toBeInTheDocument();
  });

  it('renders a dash for a missing value', () => {
    wrap(<StatCard label="Empty" value={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('FoodCard', () => {
  it('renders product, batch, score and shelf life', () => {
    wrap(<FoodCard batch={batch} />);
    expect(screen.getByText('Alphonso Mango')).toBeInTheDocument();
    expect(screen.getByText('BTCH-20260915-0007')).toBeInTheDocument();
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByText('4.2 d')).toBeInTheDocument();
    expect(screen.getByText('Cold Room A')).toBeInTheDocument();
  });

  it('survives a batch with no analysis yet', () => {
    wrap(
      <FoodCard
        batch={{ ...batch, current_freshness_score: null, current_freshness_category: null, remaining_shelf_life_days: null }}
      />,
    );
    expect(screen.getByText('Alphonso Mango')).toBeInTheDocument();
  });
});

/* ============================================================== AI panels */
describe('AI scanning', () => {
  it('ScanningOverlay renders without a crash', () => {
    const { container } = wrap(<ScanningOverlay active nodes={4} />);
    expect(container.querySelector('.scan-grid')).toBeInTheDocument();
  });

  it('AIAnalysisPanel shows the pipeline stages and progress', () => {
    wrap(
      <AIAnalysisPanel
        previewUrl="blob:x"
        stages={['Validating the image', 'Extracting colour', 'Detecting spoilage']}
        current={1}
      />,
    );
    expect(screen.getByText('Reading visual characteristics')).toBeInTheDocument();
    expect(screen.getByText('Validating the image')).toBeInTheDocument();
    expect(screen.getByText('Detecting spoilage')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });
});

describe('AssessmentSummary', () => {
  it('renders the score, model provenance and detected indicators', () => {
    wrap(<AssessmentSummary assessment={assessment} />);
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByText(/Demo AI Analysis/)).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
    expect(screen.getByText('Normal colour distribution')).toBeInTheDocument();
  });
});

describe('IndicatorList', () => {
  it('shows detected indicators with confidence', () => {
    wrap(<IndicatorList indicators={assessment.indicators} />);
    expect(screen.getByText('Discoloration / browning')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
    // Undetected indicators are hidden by default.
    expect(screen.queryByText('Possible mould growth')).not.toBeInTheDocument();
  });

  it('reports the clean case rather than showing an empty list', () => {
    wrap(<IndicatorList indicators={[assessment.indicators[0]]} />);
    expect(screen.getByText('No spoilage indicators detected')).toBeInTheDocument();
  });

  it('can include the checks that did not fire', () => {
    wrap(<IndicatorList indicators={assessment.indicators} showUndetected />);
    expect(screen.getByText('Possible mould growth')).toBeInTheDocument();
  });
});

/* ============================================================= shelf life */
describe('Shelf life', () => {
  it('ShelfLifeTimeline renders the predicted point and interval', () => {
    wrap(<ShelfLifeTimeline prediction={shelfLife} labelExpiry="2026-09-21" />);
    expect(screen.getByText('4.2d')).toBeInTheDocument();
    expect(screen.getByText(/interval 2.9–5.6d/)).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('ShelfLifeCard shows days, risk and the baseline label', () => {
    wrap(<ShelfLifeCard prediction={shelfLife} />);
    expect(screen.getByText('Shelf-life prediction')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('Baseline')).toBeInTheDocument();
  });

  it('renders nothing when there is no prediction', () => {
    wrap(<ShelfLifeCard prediction={null} />);
    // No heading, no fabricated zero — the card removes itself entirely.
    expect(screen.queryByText('Shelf-life prediction')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});

/* ================================================================ storage */
describe('StorageSnapshotCard', () => {
  it('shows current values against the required range plus violations', () => {
    wrap(<StorageSnapshotCard snapshot={snapshot} />);
    expect(screen.getByText('9.4 °C')).toBeInTheDocument();
    expect(screen.getByText('93%')).toBeInTheDocument();
    expect(screen.getByText(/Recommended 2–8 °C/)).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText(/exceeds the 8 C maximum/)).toBeInTheDocument();
    expect(screen.getByText('Move this batch to a cooler area.')).toBeInTheDocument();
  });
});

/* ======================================================= alerts + advice */
describe('AlertCard', () => {
  it('renders severity, message and actions', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    wrap(<AlertCard alert={alert} onUpdate={onUpdate} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText(alert.title)).toBeInTheDocument();
    expect(screen.getByText('Temperature Violation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
  });
});

describe('RecommendationCard', () => {
  it('renders the action, priority, impact and AI marker', () => {
    wrap(<RecommendationCard recommendation={recommendation} />);
    expect(screen.getByText(recommendation.title)).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText(/Expected impact:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Why am I seeing this/ })).toBeInTheDocument();
  });
});

/* ============================================================ primitives */
describe('New primitives render', () => {
  it('badges, plates and notices', () => {
    wrap(
      <div>
        <AIBadge />
        <DemoBadge />
        <SeverityBadge severity="CRITICAL" />
        <RiskBadge risk="HIGH" />
        <ComplianceBadge status="COMPLIANT" />
        <PriorityBadge priority="URGENT" />
        <Badge>Plain</Badge>
        <IconPlate tone="warning">!</IconPlate>
        <InlineNotice tone="warning" title="Heads up">
          Body text
        </InlineNotice>
      </div>,
    );
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Demo AI Analysis')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High risk')).toBeInTheDocument();
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });

  it('glass card, tilt wrapper, section header and data list', () => {
    wrap(
      <GlassCard>
        <Tilt3D>
          <SectionHeader eyebrow="Overview" title="Inventory" description="All stock" />
          <DataList items={[{ label: 'Batch', value: 'BTCH-1' }]} />
        </Tilt3D>
      </GlassCard>,
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('BTCH-1')).toBeInTheDocument();
  });

  it('skeletons and sparkline', () => {
    const { container } = wrap(
      <div>
        <Skeleton className="h-4 w-10" />
        <SkeletonTable rows={2} columns={3} />
        <SkeletonChart height={120} />
        <Sparkline values={[1, 5, 3, 9, 7]} />
      </div>,
    );
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(3);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('sparkline declines to render with too few points', () => {
    const { container } = wrap(<Sparkline values={[5]} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('progress steps mark done, active and pending', () => {
    wrap(<ProgressSteps steps={['Select', 'Upload', 'Analyse']} current={1} />);
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Analyse')).toBeInTheDocument();
  });

  it('tabs expose the selected state to assistive tech', () => {
    wrap(
      <Tabs
        active="a"
        onChange={() => {}}
        tabs={[
          { value: 'a', label: 'Overview', count: 3 },
          { value: 'b', label: 'History' },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: /Overview/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'false');
  });
});

/* ================================================================= theme */
describe('ThemeProvider', () => {
  it('writes the resolved theme onto the document', () => {
    wrap(<div>themed</div>);
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(light|dark)$/);
  });
});
