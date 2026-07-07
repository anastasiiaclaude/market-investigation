import { describe, it, expect } from 'vitest';
import {
  emptyFormValues,
  toFormValues,
  validate,
  toCompetitor,
  type CompetitorFormValues,
} from './competitor-form';
import { websiteKey } from './identity';
import type { Competitor } from './competitor';

const seeq: Competitor = {
  id: 'seeq.com',
  name: 'Seeq',
  website: 'https://www.seeq.com/',
  description: 'Advanced analytics for time-series process data.',
  features: {
    'realtime-dashboards': 'weak',
    'data-integration': 'adequate',
    'trend-analytics': 'strong',
    'quality-analytics': 'adequate',
    alerting: 'weak',
    reporting: 'strong',
  },
  updatedAt: '2026-07-02T10:00:00.000Z',
};

/** Blank values with a valid name + website + ratings filled in. */
function filled(overrides: Partial<CompetitorFormValues> = {}): CompetitorFormValues {
  return {
    ...emptyFormValues(),
    name: 'Acme',
    website: 'https://acme.io/product',
    features: {
      'realtime-dashboards': 'strong',
      'data-integration': 'adequate',
      'trend-analytics': 'weak',
      'quality-analytics': 'absent',
      alerting: 'adequate',
      reporting: 'strong',
    },
    ...overrides,
  };
}

describe('emptyFormValues', () => {
  it('has blank text fields and a rating for every feature area', () => {
    const v = emptyFormValues();
    expect(v.name).toBe('');
    expect(v.website).toBe('');
    expect(v.description).toBe('');
    expect(Object.keys(v.features).sort()).toEqual(
      ['alerting', 'data-integration', 'quality-analytics', 'realtime-dashboards', 'reporting', 'trend-analytics'].sort(),
    );
  });
});

describe('toFormValues', () => {
  it('round-trips a competitor into editable string values', () => {
    const v = toFormValues(seeq);
    expect(v.name).toBe(seeq.name);
    expect(v.website).toBe(seeq.website);
    expect(v.description).toBe(seeq.description);
    expect(v.features).toEqual(seeq.features);
  });
});

describe('validate', () => {
  it('returns no errors for valid values', () => {
    expect(validate(filled())).toEqual({});
  });

  it('flags an empty name', () => {
    expect(validate(filled({ name: '  ' })).name).toBeDefined();
  });

  it('flags an empty website', () => {
    expect(validate(filled({ website: '' })).website).toBeDefined();
  });

  it('flags a non-http(s) website', () => {
    expect(validate(filled({ website: 'javascript:alert(1)' })).website).toBeDefined();
    expect(validate(filled({ website: 'not a url' })).website).toBeDefined();
  });
});

describe('toCompetitor', () => {
  const now = new Date('2026-07-07T12:00:00.000Z');

  it('builds a schema-valid competitor whose id is the website key', () => {
    const c = toCompetitor(filled(), now);
    expect(c.id).toBe(websiteKey('https://acme.io/product'));
    expect(c.name).toBe('Acme');
    expect(c.updatedAt).toBe('2026-07-07T12:00:00.000Z');
  });

  it('trims the name and website', () => {
    const c = toCompetitor(filled({ name: '  Acme  ', website: '  https://acme.io/product  ' }), now);
    expect(c.name).toBe('Acme');
    expect(c.website).toBe('https://acme.io/product');
  });

  it('throws on invalid values (guarded by validate upstream)', () => {
    expect(() => toCompetitor(filled({ website: 'not-a-url' }), now)).toThrow();
  });
});
