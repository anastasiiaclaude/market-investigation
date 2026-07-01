import { describe, expect, it } from 'vitest';
import { FEATURE_AREAS, parseCompetitor, type Competitor } from './competitor';
import { MOCK_COMPETITORS } from '../mocks/competitors';

const valid: Competitor = MOCK_COMPETITORS[0]!;

describe('parseCompetitor', () => {
  it('accepts and returns a valid competitor', () => {
    expect(parseCompetitor(valid)).toEqual(valid);
  });

  it('rejects an invalid rating value', () => {
    const bad = { ...valid, features: { ...valid.features, alerting: 'excellent' } };
    expect(() => parseCompetitor(bad)).toThrow();
  });

  it('rejects a non-URL website', () => {
    expect(() => parseCompetitor({ ...valid, website: 'not-a-url' })).toThrow();
  });

  it('rejects a competitor missing a feature area', () => {
    const partialFeatures: Partial<typeof valid.features> = { ...valid.features };
    delete partialFeatures.alerting;
    expect(() => parseCompetitor({ ...valid, features: partialFeatures })).toThrow();
  });
});

describe('MOCK_COMPETITORS', () => {
  it('every record validates', () => {
    for (const c of MOCK_COMPETITORS) {
      expect(() => parseCompetitor(c)).not.toThrow();
    }
  });

  it('every record is rated across all six feature areas', () => {
    for (const c of MOCK_COMPETITORS) {
      expect(Object.keys(c.features).sort()).toEqual([...FEATURE_AREAS].sort());
    }
  });
});
