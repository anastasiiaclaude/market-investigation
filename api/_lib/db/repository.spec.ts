import { describe, it, expect } from 'vitest';
import { inMemoryRepo } from './in-memory-repo';
import { rowToCompetitor } from './repository';
import type { Competitor } from '../../../app/src/domain/competitor';

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

describe('rowToCompetitor', () => {
  it('validates a row as a domain Competitor', () => {
    expect(rowToCompetitor(seeq)).toEqual(seeq);
  });

  it('throws when the row violates the schema', () => {
    expect(() => rowToCompetitor({ ...seeq, website: 'not-a-url' })).toThrow();
  });
});

describe('inMemoryRepo (CompetitorRepo contract)', () => {
  it('lists what was upserted and reads it back by id', async () => {
    const repo = inMemoryRepo();
    await repo.upsert(seeq);
    expect(await repo.list()).toEqual([seeq]);
    expect(await repo.get('seeq.com')).toEqual(seeq);
    expect(await repo.get('missing')).toBeNull();
  });

  it('upsert dedupes on id — a second upsert updates in place', async () => {
    const repo = inMemoryRepo();
    await repo.upsert(seeq);
    await repo.upsert({ ...seeq, description: 'Updated summary.' });
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.description).toBe('Updated summary.');
  });

  it('remove deletes and reports whether a row matched', async () => {
    const repo = inMemoryRepo([seeq]);
    expect(await repo.remove('seeq.com')).toBe(true);
    expect(await repo.remove('seeq.com')).toBe(false);
    expect(await repo.list()).toEqual([]);
  });
});
