import { describe, expect, it } from 'vitest';
import {
  clamp,
  daysUntilLabel,
  formatBytes,
  formatHumidity,
  formatPercent,
  formatQuantity,
  formatScore,
  formatTemperature,
  scoreBand,
  scoreColor,
  statusMeta,
  severityMeta,
  complianceMeta,
  titleise,
  truncate,
} from '../utils/format';

describe('score banding', () => {
  it('maps scores to the specification bands', () => {
    expect(scoreBand(100)).toBe('FRESH');
    expect(scoreBand(90)).toBe('FRESH');
    expect(scoreBand(89)).toBe('GOOD');
    expect(scoreBand(75)).toBe('GOOD');
    expect(scoreBand(74)).toBe('ACCEPTABLE');
    expect(scoreBand(60)).toBe('ACCEPTABLE');
    expect(scoreBand(59)).toBe('NEAR_SPOILAGE');
    expect(scoreBand(30)).toBe('NEAR_SPOILAGE');
    expect(scoreBand(29)).toBe('SPOILED');
    expect(scoreBand(0)).toBe('SPOILED');
  });

  it('returns UNKNOWN when no score exists', () => {
    expect(scoreBand(null)).toBe('UNKNOWN');
    expect(scoreBand(undefined)).toBe('UNKNOWN');
  });

  it('gives every band a distinct colour', () => {
    const colours = [95, 80, 67, 45, 10].map(scoreColor);
    expect(new Set(colours).size).toBe(5);
  });
});

describe('status metadata is accessible', () => {
  it('pairs colour with an icon and label for every status', () => {
    ['FRESH', 'GOOD', 'ACCEPTABLE', 'NEAR_SPOILAGE', 'SPOILED', 'EXPIRED'].forEach((status) => {
      const meta = statusMeta(status);
      expect(meta.label).toBeTruthy();
      expect(meta.icon).toBeTruthy(); // never colour alone
      expect(meta.badge).toContain('ring-');
    });
  });

  it('falls back gracefully for unknown values', () => {
    expect(statusMeta('NOPE').label).toBe('Unknown');
    expect(statusMeta(null).label).toBe('Unknown');
  });

  it('provides severity and compliance metadata with icons', () => {
    expect(severityMeta('CRITICAL').label).toBe('Critical');
    expect(severityMeta('CRITICAL').icon).toBeTruthy();
    expect(severityMeta(undefined).label).toBe('Info');
    expect(complianceMeta('NON_COMPLIANT').label).toBe('Non-compliant');
    expect(complianceMeta('WAT').label).toBe('Not recorded');
  });
});

describe('formatters', () => {
  it('formats scores and percentages', () => {
    expect(formatScore(81.4)).toBe('81');
    expect(formatScore(null)).toBe('—');
    expect(formatPercent(0.913, { fromFraction: true })).toBe('91%');
    expect(formatPercent(45.6, { digits: 1 })).toBe('45.6%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats quantities, temperature and humidity', () => {
    expect(formatQuantity(12, 'kg')).toBe('12 kg');
    expect(formatQuantity(12.5, 'kg')).toBe('12.50 kg');
    expect(formatQuantity(null, 'kg')).toBe('—');
    expect(formatTemperature(6.24)).toBe('6.2 °C');
    expect(formatTemperature(null)).toBe('—');
    expect(formatHumidity(84.6)).toBe('85%');
  });

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(0)).toBe('—');
  });

  it('humanises enum values', () => {
    expect(titleise('NEAR_SPOILAGE')).toBe('Near Spoilage');
    expect(titleise('storage_alert')).toBe('Storage Alert');
    expect(titleise(null)).toBe('—');
  });

  it('describes expiry windows in plain language', () => {
    expect(daysUntilLabel(0)).toBe('Today');
    expect(daysUntilLabel(1)).toBe('Tomorrow');
    expect(daysUntilLabel(5)).toBe('In 5d');
    expect(daysUntilLabel(-3)).toBe('3d overdue');
    expect(daysUntilLabel(null)).toBe('No date');
  });

  it('clamps and truncates', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
    expect(truncate('abc', 5)).toBe('abc');
  });
});
