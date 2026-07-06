import { describe, it, expect } from 'vitest';
import { seed } from './seed';
import { inMemoryRepo } from './in-memory-repo';
import { websiteKey } from '../../../app/src/domain/identity';
import { MOCK_COMPETITORS } from '../../../app/src/mocks/competitors';

describe('seed', () => {
  it('loads the mock competitors, keyed by their URL identity', async () => {
    const repo = inMemoryRepo();
    await seed(repo, MOCK_COMPETITORS);

    const all = await repo.list();
    expect(all).toHaveLength(MOCK_COMPETITORS.length);
    for (const competitor of MOCK_COMPETITORS) {
      const key = websiteKey(competitor.website);
      expect((await repo.get(key))?.name).toBe(competitor.name);
    }
  });

  it('is idempotent — seeding twice leaves the same number of rows', async () => {
    const repo = inMemoryRepo();
    await seed(repo, MOCK_COMPETITORS);
    await seed(repo, MOCK_COMPETITORS);
    expect(await repo.list()).toHaveLength(MOCK_COMPETITORS.length);
  });
});
