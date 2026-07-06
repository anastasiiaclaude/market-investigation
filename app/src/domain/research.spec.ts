import { describe, it, expect } from 'vitest';
import { parseResearchResult, toCompetitor } from './research';
import { competitorSchema } from './competitor';

const validResult = {
  name: 'Acme Analytics',
  description: 'Time-series analytics for process engineers.',
  features: {
    'realtime-dashboards': 'strong',
    'data-integration': 'adequate',
    'trend-analytics': 'weak',
    'quality-analytics': 'absent',
    alerting: 'adequate',
    reporting: 'weak',
  },
} as const;

describe('parseResearchResult', () => {
  it('accepts a well-formed model result', () => {
    expect(parseResearchResult(validResult)).toEqual(validResult);
  });

  it('rejects a result missing a feature area', () => {
    const partialFeatures: Record<string, string> = { ...validResult.features };
    delete partialFeatures.reporting;
    expect(() => parseResearchResult({ ...validResult, features: partialFeatures })).toThrow();
  });

  it('rejects an unknown feature area', () => {
    expect(() =>
      parseResearchResult({
        ...validResult,
        features: { ...validResult.features, telemetry: 'strong' },
      }),
    ).toThrow();
  });

  it('rejects an invalid rating value', () => {
    expect(() =>
      parseResearchResult({
        ...validResult,
        features: { ...validResult.features, alerting: 'excellent' },
      }),
    ).toThrow();
  });

  it('rejects an empty name', () => {
    expect(() => parseResearchResult({ ...validResult, name: '' })).toThrow();
  });
});

describe('toCompetitor', () => {
  const url = 'https://competitor.example.com/product';
  const now = new Date('2026-07-02T10:00:00.000Z');

  it('assembles a schema-valid Competitor from a result + url + timestamp', () => {
    const competitor = toCompetitor(parseResearchResult(validResult), url, now);
    expect(() => competitorSchema.parse(competitor)).not.toThrow();
    expect(competitor.website).toBe(url);
    expect(competitor.description).toBe(validResult.description);
    expect(competitor.features).toEqual(validResult.features);
    expect(competitor.updatedAt).toBe('2026-07-02T10:00:00.000Z');
  });

  it('derives the id from the website URL, not the name (M6 identity)', () => {
    const competitor = toCompetitor(parseResearchResult(validResult), url, now);
    expect(competitor.id).toBe('competitor.example.com/product');
  });

  it('gives the same id for equivalent URL spellings of the same site', () => {
    const a = toCompetitor(parseResearchResult(validResult), 'https://www.competitor.example.com/product/', now);
    const b = toCompetitor(parseResearchResult(validResult), 'https://competitor.example.com/product', now);
    expect(a.id).toBe(b.id);
  });
});
