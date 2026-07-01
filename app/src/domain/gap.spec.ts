import { describe, expect, it } from 'vitest';
import type { Competitor, FeatureArea, Rating } from './competitor';
import { FEATURE_AREAS } from './competitor';
import { buildComparison, isGap } from './gap';

/** Build a competitor whose every feature carries `rating`, overridden by `overrides`. */
function makeCompetitor(
  id: string,
  rating: Rating,
  overrides: Partial<Record<FeatureArea, Rating>> = {},
): Competitor {
  const features = Object.fromEntries(
    FEATURE_AREAS.map((area) => [area, overrides[area] ?? rating]),
  ) as Record<FeatureArea, Rating>;
  return {
    id,
    name: id,
    website: `https://example.com/${id}`,
    description: '',
    features,
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}

const AREA: FeatureArea = 'alerting';

describe('isGap', () => {
  it('flags a weak/absent home area when a competitor rates strictly higher', () => {
    const home = makeCompetitor('home', 'strong', { [AREA]: 'weak' });
    const rival = makeCompetitor('rival', 'weak', { [AREA]: 'strong' });
    expect(isGap(AREA, home, [rival])).toBe(true);
  });

  it('flags an absent home area against any rated competitor', () => {
    const home = makeCompetitor('home', 'strong', { [AREA]: 'absent' });
    const rival = makeCompetitor('rival', 'strong', { [AREA]: 'weak' });
    expect(isGap(AREA, home, [rival])).toBe(true);
  });

  it('is not a gap when every competitor is equally weak or weaker', () => {
    const home = makeCompetitor('home', 'strong', { [AREA]: 'weak' });
    const rivalWeak = makeCompetitor('a', 'strong', { [AREA]: 'weak' });
    const rivalAbsent = makeCompetitor('b', 'strong', { [AREA]: 'absent' });
    expect(isGap(AREA, home, [rivalWeak, rivalAbsent])).toBe(false);
  });

  it('is never a gap when home is strong or adequate', () => {
    const strongHome = makeCompetitor('home', 'strong', { [AREA]: 'strong' });
    const adequateHome = makeCompetitor('home', 'strong', { [AREA]: 'adequate' });
    const rival = makeCompetitor('rival', 'strong', { [AREA]: 'strong' });
    expect(isGap(AREA, strongHome, [rival])).toBe(false);
    expect(isGap(AREA, adequateHome, [rival])).toBe(false);
  });

  it('is not a gap with no competitors', () => {
    const home = makeCompetitor('home', 'strong', { [AREA]: 'absent' });
    expect(isGap(AREA, home, [])).toBe(false);
  });
});

describe('buildComparison', () => {
  const home = makeCompetitor('va-indigo', 'strong', { alerting: 'weak', reporting: 'absent' });
  const strongRival = makeCompetitor('rival-strong', 'strong');
  const weakRival = makeCompetitor('rival-weak', 'weak');

  it('produces one row per feature area, in canonical order', () => {
    const model = buildComparison(home, [strongRival]);
    expect(model.rows.map((r) => r.area)).toEqual([...FEATURE_AREAS]);
  });

  it('carries the home cell with its gap flag on each row', () => {
    const model = buildComparison(home, [strongRival]);
    const alerting = model.rows.find((r) => r.area === 'alerting')!;
    const dashboards = model.rows.find((r) => r.area === 'realtime-dashboards')!;
    expect(alerting.home.isGap).toBe(true);
    expect(alerting.home.cell.rating).toBe('weak');
    expect(dashboards.home.isGap).toBe(false);
  });

  it('aligns competitor cells to the input competitor order', () => {
    const model = buildComparison(home, [strongRival, weakRival]);
    expect(model.competitors).toEqual([strongRival, weakRival]);
    const alerting = model.rows.find((r) => r.area === 'alerting')!;
    expect(alerting.competitors.map((c) => c.rating)).toEqual(['strong', 'weak']);
  });
});
