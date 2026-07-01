import { describe, expect, it } from 'vitest';
import type { Competitor, FeatureArea } from './competitor';
import { FEATURE_AREAS } from './competitor';
import { filterCompetitors, visibleAreas } from './filter';

function makeCompetitor(id: string, name: string, description = ''): Competitor {
  const features = Object.fromEntries(
    FEATURE_AREAS.map((area) => [area, 'adequate']),
  ) as Competitor['features'];
  return {
    id,
    name,
    website: `https://example.com/${id}`,
    description,
    features,
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}

const aveva = makeCompetitor('aveva', 'AVEVA PI System', 'Industrial data historian.');
const seeq = makeCompetitor('seeq', 'Seeq', 'Advanced analytics for time-series data.');
const all = [aveva, seeq];

describe('filterCompetitors', () => {
  it('returns everyone for an empty or whitespace query', () => {
    expect(filterCompetitors(all, '')).toEqual(all);
    expect(filterCompetitors(all, '   ')).toEqual(all);
  });

  it('matches on name, case-insensitively', () => {
    expect(filterCompetitors(all, 'aveva')).toEqual([aveva]);
    expect(filterCompetitors(all, 'SEEQ')).toEqual([seeq]);
  });

  it('matches on description', () => {
    expect(filterCompetitors(all, 'historian')).toEqual([aveva]);
    expect(filterCompetitors(all, 'time-series')).toEqual([seeq]);
  });

  it('trims the query before matching', () => {
    expect(filterCompetitors(all, '  seeq  ')).toEqual([seeq]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterCompetitors(all, 'siemens')).toEqual([]);
  });

  it('preserves the input order', () => {
    expect(filterCompetitors(all, 'a')).toEqual([aveva, seeq]);
  });
});

describe('visibleAreas', () => {
  it('returns all areas in canonical order for an empty selection', () => {
    expect(visibleAreas([])).toEqual([...FEATURE_AREAS]);
  });

  it('returns only the selected areas, in canonical order', () => {
    const selected: FeatureArea[] = ['reporting', 'alerting'];
    expect(visibleAreas(selected)).toEqual(['alerting', 'reporting']);
  });

  it('ignores duplicate selections', () => {
    expect(visibleAreas(['alerting', 'alerting'])).toEqual(['alerting']);
  });
});
