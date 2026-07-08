import { describe, it, expect } from 'vitest';
import { toCsv, csvField, CSV_FILENAME } from './export';
import type { Competitor, FeatureArea, Rating } from './competitor';
import { FEATURE_AREAS } from './competitor';

function make(name: string, ratings: Partial<Record<FeatureArea, Rating>>, fallback: Rating = 'adequate'): Competitor {
  const features = Object.fromEntries(FEATURE_AREAS.map((a) => [a, ratings[a] ?? fallback])) as Record<FeatureArea, Rating>;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return { id: `${slug}.example.com`, name, website: `https://${slug}.example.com/`, description: '', features, updatedAt: '2026-07-08T00:00:00.000Z' };
}

const home = make('VA-INDIGO', { 'quality-analytics': 'weak' }, 'strong');
const rival = make('Rival A', { 'quality-analytics': 'strong' });

function rows(csv: string): string[] {
  return csv.split('\r\n');
}

describe('csvField', () => {
  it('leaves plain fields unquoted', () => {
    expect(csvField('Strong')).toBe('Strong');
  });
  it('quotes and doubles quotes for fields with commas/quotes/newlines', () => {
    expect(csvField('Acme, Inc.')).toBe('"Acme, Inc."');
    expect(csvField('a "b" c')).toBe('"a ""b"" c"');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('toCsv', () => {
  it('starts with a header naming the feature column, home, and each competitor', () => {
    const [header] = rows(toCsv(home, [rival]));
    expect(header).toBe('Feature area,VA-INDIGO (VA-INDIGO),Rival A');
  });

  it('has one row per feature area with rating labels', () => {
    const lines = rows(toCsv(home, [rival]));
    expect(lines).toHaveLength(1 + FEATURE_AREAS.length); // header + 6 areas
    const qa = lines.find((l) => l.startsWith('Process & quality analytics'));
    expect(qa).toContain(',Weak (gap),'); // home weak + it's a gap
    expect(qa?.endsWith('Strong')).toBe(true); // rival strong
  });

  it('suffixes the home cell with (gap) only for gap areas', () => {
    const csv = toCsv(home, [rival]);
    expect(csv).toContain('Weak (gap)');
    // A non-gap home area (realtime-dashboards is strong) is not suffixed.
    const dash = rows(csv).find((l) => l.startsWith('Real-time KPI dashboards'));
    expect(dash).not.toContain('(gap)');
  });

  it('escapes a competitor name containing a comma', () => {
    const [header] = rows(toCsv(home, [make('Acme, Inc.', {})]));
    expect(header).toBe('Feature area,VA-INDIGO (VA-INDIGO),"Acme, Inc."');
  });

  it('restricts rows to the given area subset, in the passed order', () => {
    const lines = rows(toCsv(home, [rival], ['alerting', 'realtime-dashboards']));
    // buildComparison maps over the given areas array, preserving its order.
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual([
      'Alerting & notifications',
      'Real-time KPI dashboards',
    ]);
  });

  it('exposes a stable download filename', () => {
    expect(CSV_FILENAME).toBe('va-indigo-comparison.csv');
  });
});
