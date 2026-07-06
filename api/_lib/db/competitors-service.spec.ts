import { describe, it, expect } from 'vitest';
import { inMemoryRepo } from './in-memory-repo';
import {
  listCompetitors,
  getCompetitor,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
} from './competitors-service';
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

describe('competitors-service', () => {
  it('create upserts and list/get read it back', async () => {
    const repo = inMemoryRepo();
    const created = await createCompetitor(repo, seeq);
    expect(created.status).toBe(201);
    expect(created.body).toEqual(seeq);

    expect((await listCompetitors(repo)).body).toEqual([seeq]);
    expect((await getCompetitor(repo, 'seeq.com')).body).toEqual(seeq);
  });

  it('create rejects an invalid record with 400 and does not persist', async () => {
    const repo = inMemoryRepo();
    const res = await createCompetitor(repo, { ...seeq, website: 'not-a-url' });
    expect(res.status).toBe(400);
    expect((await listCompetitors(repo)).body).toEqual([]);
  });

  it('get/update/delete on a missing id return 404', async () => {
    const repo = inMemoryRepo();
    expect((await getCompetitor(repo, 'nope')).status).toBe(404);
    expect((await updateCompetitor(repo, 'nope', { name: 'x' })).status).toBe(404);
    expect((await deleteCompetitor(repo, 'nope')).status).toBe(404);
  });

  it('update merges a valid patch and returns the updated record', async () => {
    const repo = inMemoryRepo([seeq]);
    const res = await updateCompetitor(repo, 'seeq.com', { description: 'New summary.' });
    expect(res.status).toBe(200);
    expect((res.body as Competitor).description).toBe('New summary.');
  });

  it('update rejects a patch that would make the record invalid (400)', async () => {
    const repo = inMemoryRepo([seeq]);
    const res = await updateCompetitor(repo, 'seeq.com', {
      features: { ...seeq.features, alerting: 'excellent' } as Competitor['features'],
    });
    expect(res.status).toBe(400);
  });

  it('update rejects a non-object body with 400', async () => {
    const repo = inMemoryRepo([seeq]);
    expect((await updateCompetitor(repo, 'seeq.com', 'nope')).status).toBe(400);
  });

  it('create derives the id from the website, ignoring a client-supplied id', async () => {
    const repo = inMemoryRepo();
    const res = await createCompetitor(repo, { ...seeq, id: 'client-chosen' });
    expect(res.status).toBe(201);
    expect((res.body as Competitor).id).toBe('seeq.com');
    expect(await repo.get('client-chosen')).toBeNull();
  });

  it('update ignores an id in the patch — identity is immutable', async () => {
    const repo = inMemoryRepo([seeq]);
    const res = await updateCompetitor(repo, 'seeq.com', {
      id: 'hacked',
      name: 'Seeq Inc.',
    } as Partial<Competitor>);
    expect(res.status).toBe(200);
    expect((res.body as Competitor).id).toBe('seeq.com');
    expect(await repo.get('hacked')).toBeNull();
  });

  it('update rejects a website change that would alter the id (dedup invariant)', async () => {
    const repo = inMemoryRepo([seeq]);
    const res = await updateCompetitor(repo, 'seeq.com', { website: 'https://other.example.com/' });
    expect(res.status).toBe(400);
    expect((await repo.get('seeq.com'))?.website).toBe(seeq.website); // unchanged
  });

  it('delete removes the record and returns 204', async () => {
    const repo = inMemoryRepo([seeq]);
    const res = await deleteCompetitor(repo, 'seeq.com');
    expect(res.status).toBe(204);
    expect(res.body).toBeUndefined();
    expect((await listCompetitors(repo)).body).toEqual([]);
  });
});
