/**
 * Console-cleanliness guard.
 *
 * React reports invalid DOM nesting, unknown props, missing keys and bad state
 * updates through `console.error` / `console.warn` rather than by throwing. A
 * green test suite can therefore still hide a browser console full of warnings.
 * This mounts the redesigned surfaces and fails if either channel is used.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import DashboardHero from '../components/DashboardHero';
import FreshnessOrb from '../components/FreshnessOrb';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataList,
  GlassCard,
  Input,
  Modal,
  Pagination,
  ProgressSteps,
  ScoreBar,
  ScoreRing,
  Select,
  Sparkline,
  StatCard,
  Tabs,
  Textarea,
  Tilt3D,
} from '../components/ui';
import {
  AIAnalysisPanel,
  AlertList,
  AssessmentSummary,
  EnvTile,
  FoodCard,
  IndicatorList,
  RecommendationList,
  ScoreExplanation,
  ShelfLifeCard,
  ShelfLifeTimeline,
  StorageSnapshotCard,
} from '../components/domain';

vi.mock('../services/apiClient', () => ({
  fetchImageObjectUrl: vi.fn().mockResolvedValue('blob:test'),
  api: { get: vi.fn(), post: vi.fn() },
}));

let errors = [];
let warnings = [];

beforeEach(() => {
  errors = [];
  warnings = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')));
  vi.spyOn(console, 'warn').mockImplementation((...args) => warnings.push(args.join(' ')));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mount(ui) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function expectQuietConsole() {
  /**
   * Two classes of message are filtered, both from third-party code rather than
   * from the components under test:
   *
   *  - Recharts warns about a 0x0 container because jsdom performs no layout.
   *  - React Router emits advisory notices inviting opt-in to v7 behaviour.
   *
   * Anything else - invalid DOM nesting, unknown props, missing keys, bad state
   * updates - is a genuine defect and fails the test.
   */
  const IGNORE = /width\(0\) and height\(0\)|ResponsiveContainer|React Router Future Flag Warning/i;
  const relevant = (list) => list.filter((m) => !IGNORE.test(m));
  expect(relevant(errors), `console.error was called:\n${errors.join('\n---\n')}`).toEqual([]);
  expect(relevant(warnings), `console.warn was called:\n${warnings.join('\n---\n')}`).toEqual([]);
}

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
  freshness_score: 80.8,
  freshness_category: 'GOOD',
  confidence: 0.91,
  spoilage_probability: 0.08,
  overall_health_score: 77,
  processing_ms: 54,
  created_at: '2026-09-15T10:00:00Z',
  components: { visual: 82, storage: 74, shelf_life: 80, product_age: 90 },
  weights_used: { visual: 0.4, storage: 0.25, shelf_life: 0.2, product_age: 0.15 },
  detected_indicators: ['Normal colour distribution'],
  model: { name: 'baseline-cv', version: '1.2.0', is_demo: true, label: 'Demo AI Analysis (baseline)' },
  features: { browning_ratio: 0.12, lbp_entropy: 4.4 },
  indicators: [
    {
      indicator_type: 'DISCOLORATION',
      label: 'Discoloration / browning',
      severity: 'MEDIUM',
      confidence: 0.62,
      affected_area_ratio: 0.14,
      detected: true,
      description: 'Brown pixels account for 14% of the region.',
      detector: 'opencv-baseline',
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
  explanation: 'Baseline kinetic prediction.',
  factors: { temperature_factor: 0.82 },
  model: { is_demo: true, label: 'Baseline prediction' },
};

const snapshot = {
  batch_id: 7,
  location_name: 'Cold Room A',
  compliance_status: 'WARNING',
  risk_level: 'MEDIUM',
  storage_score: 87,
  storage_duration_days: 3,
  current: { temperature_c: 9.4, humidity_pct: 93, air_circulation: 'POOR', light_exposure: 'LOW' },
  required: { temp_min_c: 2, temp_max_c: 8, humidity_min_pct: 85, humidity_max_pct: 95 },
  violations: [{ parameter: 'temperature', status: 'WARNING', message: 'Above maximum.' }],
  recommendation: 'Move to a cooler area.',
};

describe('console cleanliness', () => {
  it('dashboard hero and orb mount without React complaints', () => {
    mount(
      <DashboardHero
        name="Asha"
        roleLabel="Consumer"
        score={81.4}
        headline="Overview"
        subheadline="Detail"
        stats={[
          { label: 'Items', value: 44 },
          { label: 'Alerts', value: 2 },
        ]}
      />,
    );
    expectQuietConsole();
  });

  it('freshness orb mounts at every size', () => {
    mount(
      <div>
        <FreshnessOrb score={95} category="FRESH" size="sm" />
        <FreshnessOrb score={64} category="ACCEPTABLE" size="md" />
        <FreshnessOrb score={12} category="SPOILED" size="lg" showReadout={false} />
      </div>,
    );
    expectQuietConsole();
  });

  it('ui primitives mount without React complaints', () => {
    mount(
      <div>
        <Card>
          <CardHeader title="Header" subtitle="Sub" actions={<Button size="xs">Do</Button>} />
          <CardBody>
            <StatCard label="A" value={1} spark={[1, 2, 3, 4]} progress={64} trend={{ direction: 'up', label: '+2%' }} />
            <ScoreRing score={81} label="Freshness" breakdown={assessment.components} glow />
            <ScoreBar label="Visual" value={82} weight={0.4} />
            <Sparkline values={[3, 6, 4, 9]} />
            <DataList items={[{ label: 'K', value: 'V' }]} />
            <ProgressSteps steps={['One', 'Two', 'Three']} current={1} />
            <Input label="Name" value="x" onChange={() => {}} />
            <Select label="Pick" value="a" onChange={() => {}} options={[{ value: 'a', label: 'A' }]} />
            <Textarea label="Notes" value="" onChange={() => {}} />
            <Pagination page={2} totalPages={5} total={95} pageSize={20} onPageChange={() => {}} />
          </CardBody>
        </Card>
        <GlassCard>
          <Tilt3D>
            <p>tilted</p>
          </Tilt3D>
        </GlassCard>
        <Tabs active="a" onChange={() => {}} tabs={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />
      </div>,
    );
    expectQuietConsole();
  });

  it('modal mounts open without React complaints', () => {
    mount(
      <Modal open onClose={() => {}} title="Title" description="Desc">
        <p>content</p>
      </Modal>,
    );
    expectQuietConsole();
  });

  it('domain components mount without React complaints', () => {
    mount(
      <div>
        <FoodCard batch={batch} quantity={5} unit="kg" priority={72} />
        <AssessmentSummary assessment={assessment} />
        <ScoreExplanation assessment={assessment} />
        <IndicatorList indicators={assessment.indicators} showUndetected />
        <ShelfLifeCard prediction={shelfLife} labelExpiry="2026-09-21" />
        <ShelfLifeTimeline prediction={shelfLife} />
        <StorageSnapshotCard snapshot={snapshot} />
        <EnvTile label="Temperature" value="9.4 °C" status="WARNING" hint="Recommended 2–8 °C" />
        <AlertList
          alerts={[
            {
              id: 1,
              alert_type: 'TEMPERATURE_VIOLATION',
              severity: 'HIGH',
              title: 'Too warm',
              message: 'Above range.',
              is_read: false,
              resolved: false,
              created_at: '2026-09-15T09:00:00Z',
            },
          ]}
        />
        <RecommendationList
          recommendations={[
            {
              id: 2,
              recommendation_type: 'STORAGE',
              priority: 'HIGH',
              title: 'Move it',
              message: 'Move the batch.',
              rationale: 'Too warm.',
              rule_id: 'R1',
              acknowledged: false,
            },
          ]}
        />
      </div>,
    );
    expectQuietConsole();
  });

  it('AI analysis panel mounts without React complaints', () => {
    mount(
      <AIAnalysisPanel
        previewUrl="blob:x"
        stages={['Validating', 'Extracting', 'Detecting', 'Scoring']}
        current={2}
      />,
    );
    expectQuietConsole();
  });
});
