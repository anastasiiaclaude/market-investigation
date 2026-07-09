import { describe, it, expect, vi } from 'vitest';
import { refreshAllCompetitors } from './cron.js';
import { inMemoryRepo } from './db/in-memory-repo.js';
import { OPENROUTER_URL } from './openrouter.js';
import type { Competitor, FeatureArea, Rating } from '../../app/src/domain/competitor.js';
import { FEATURE_AREAS } from '../../app/src/domain/competitor.js';

const modelReply = {
  name: 'Refreshed Co',
  description: 'Updated summary from the scheduled run.',
  features: {
    'realtime-dashboards': 'strong',
    'data-integration': 'adequate',
    'trend-analytics': 'strong',
    'quality-analytics': 'adequate',
    alerting: 'weak',
    reporting: 'strong',
  },
};

/** A competitor whose id is its URL key (matches what runResearch upserts). */
function make(id: string, website: string): Competitor {
  const features = Object.fromEntries(FEATURE_AREAS.map((a) => [a, 'weak' as Rating])) as Record<FeatureArea, Rating>;
  return { id, name: id, website, description: 'old', features, updatedAt: '2026-01-01T00:00:00.000Z' };
}

const base = { apiKey: 'sk-test', model: 'anthropic/claude-sonnet-4-6', now: new Date('2026-07-09T00:00:00.000Z') };

/** Fake fetch: OpenRouter completion for the API URL; HTML page otherwise, but a
 *  non-OK status for any URL containing `failHost`. */
function makeFetch(failHost?: string) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u === OPENROUTER_URL) {
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelReply) } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (failHost && u.includes(failHost)) return new Response('nope', { status: 500 });
    return new Response('<html><body><p>page</p></body></html>', { status: 200 });
  });
}

describe('refreshAllCompetitors', () => {
  it('re-researches and upserts every competitor', async () => {
    const repo = inMemoryRepo();
    await repo.upsert(make('a.example.com', 'https://a.example.com/'));
    await repo.upsert(make('b.example.com', 'https://b.example.com/'));

    const result = await refreshAllCompetitors({ ...base, repo, fetchImpl: makeFetch() });

    expect(result.refreshed.sort()).toEqual(['a.example.com', 'b.example.com']);
    expect(result.failed).toEqual([]);
    // The row was updated in place (dedup by URL key), not duplicated.
    const all = await repo.list();
    expect(all).toHaveLength(2);
    const a = await repo.get('a.example.com');
    expect(a?.description).toBe(modelReply.description);
    expect(a?.updatedAt).toBe('2026-07-09T00:00:00.000Z');
  });

  it('isolates a per-competitor failure and continues the batch', async () => {
    const repo = inMemoryRepo();
    await repo.upsert(make('a.example.com', 'https://a.example.com/'));
    await repo.upsert(make('b.example.com', 'https://b.example.com/'));

    const result = await refreshAllCompetitors({ ...base, repo, fetchImpl: makeFetch('b.example.com') });

    expect(result.refreshed).toEqual(['a.example.com']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.id).toBe('b.example.com');
    // The failed competitor keeps its old data.
    expect((await repo.get('b.example.com'))?.description).toBe('old');
  });

  it('returns empty results and never fetches for an empty repo', async () => {
    const fetchImpl = makeFetch();
    const result = await refreshAllCompetitors({ ...base, repo: inMemoryRepo(), fetchImpl });
    expect(result).toEqual({ refreshed: [], failed: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
