import { describe, it, expect, vi } from 'vitest';
import {
  resolveSpaceId,
  findPageIdByTitle,
  createPage,
  updatePage,
  publishComparison,
  type ConfluenceConfig,
} from './confluence';
import { AtlassianError } from './atlassian';
import { COMPARISON_PAGE_TITLE } from '../../app/src/domain/confluence';
import type { Competitor, FeatureArea, Rating } from '../../app/src/domain/competitor';
import { FEATURE_AREAS } from '../../app/src/domain/competitor';

const config: ConfluenceConfig = {
  baseUrl: 'https://site.atlassian.net',
  email: 'me@x.com',
  apiToken: 'tok',
  spaceKey: 'SOFTWAREEN',
};

function make(name: string, ratings: Partial<Record<FeatureArea, Rating>>, fallback: Rating = 'adequate'): Competitor {
  const features = Object.fromEntries(FEATURE_AREAS.map((a) => [a, ratings[a] ?? fallback])) as Record<FeatureArea, Rating>;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return { id: `${slug}.example.com`, name, website: `https://${slug}.example.com/`, description: '', features, updatedAt: '2026-07-08T00:00:00.000Z' };
}

const home = make('VA-INDIGO', { 'quality-analytics': 'weak' }, 'strong');
const rival = make('Rival A', { 'quality-analytics': 'strong' });

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('resolveSpaceId', () => {
  it('returns the first matching space id', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ results: [{ id: '688132' }] })) as unknown as typeof fetch;
    expect(await resolveSpaceId(config, fetchImpl)).toBe('688132');
  });

  it('throws a 404 AtlassianError when the space is not found', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ results: [] })) as unknown as typeof fetch;
    const err = await resolveSpaceId(config, fetchImpl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AtlassianError);
    expect((err as AtlassianError).status).toBe(404);
  });

  it('maps a non-OK status to an AtlassianError', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ error: 'x' }, 429)) as unknown as typeof fetch;
    const err = await resolveSpaceId(config, fetchImpl).catch((e: unknown) => e);
    expect((err as AtlassianError).status).toBe(429);
  });
});

describe('findPageIdByTitle', () => {
  it('returns the id of an exact-title match', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonRes({ results: [{ id: '999', title: COMPARISON_PAGE_TITLE }] }),
    ) as unknown as typeof fetch;
    expect(await findPageIdByTitle('688132', COMPARISON_PAGE_TITLE, config, fetchImpl)).toBe('999');
  });

  it('returns null when nothing matches the title', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ results: [{ id: '1', title: 'Other' }] })) as unknown as typeof fetch;
    expect(await findPageIdByTitle('688132', COMPARISON_PAGE_TITLE, config, fetchImpl)).toBeNull();
  });
});

describe('createPage', () => {
  it('POSTs a storage-format page and returns id + url', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return jsonRes({ id: '999', _links: { webui: '/spaces/SOFTWAREEN/pages/999/x', base: 'https://site.atlassian.net/wiki' } }, 201);
    }) as unknown as typeof fetch;

    const res = await createPage('688132', 'T', '<p>body</p>', config, fetchImpl);
    expect(res).toEqual({ id: '999', url: 'https://site.atlassian.net/wiki/spaces/SOFTWAREEN/pages/999/x' });
    expect(calls[0]?.url).toBe('https://site.atlassian.net/wiki/api/v2/pages');
    const body = JSON.parse(String(calls[0]?.init?.body));
    expect(body.spaceId).toBe('688132');
    expect(body.status).toBe('current');
    expect(body.body).toEqual({ representation: 'storage', value: '<p>body</p>' });
  });
});

describe('updatePage', () => {
  it('reads the current version and PUTs version + 1', async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method ?? 'GET';
      calls.push({ url: u, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (method === 'GET') return jsonRes({ id: '999', version: { number: 3 } });
      return jsonRes({ id: '999', _links: { webui: '/p/999' } });
    }) as unknown as typeof fetch;

    const res = await updatePage('999', 'T', '<p>x</p>', config, fetchImpl);
    expect(res.id).toBe('999');
    const put = calls.find((c) => c.method === 'PUT');
    expect((put?.body as { version: { number: number } }).version.number).toBe(4);
  });
});

describe('publishComparison', () => {
  /** Route the full sequence: space lookup, page search, then create or update. */
  function fakeFetch(existingPageId: string | null) {
    return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method ?? 'GET';
      if (u.includes('/api/v2/spaces?keys=')) return jsonRes({ results: [{ id: '688132' }] });
      if (u.includes('/api/v2/pages?space-id=')) {
        return jsonRes({ results: existingPageId ? [{ id: existingPageId, title: COMPARISON_PAGE_TITLE }] : [] });
      }
      if (method === 'GET' && /\/api\/v2\/pages\/\w+$/.test(u)) return jsonRes({ id: existingPageId, version: { number: 5 } });
      return jsonRes({ id: existingPageId ?? '999', _links: { webui: '/p/1' } }); // POST or PUT
    }) as unknown as typeof fetch;
  }

  it('creates the page when none exists', async () => {
    const res = await publishComparison({ home, competitors: [rival], config, fetchImpl: fakeFetch(null) });
    expect(res.action).toBe('created');
    expect(res.pageId).toBe('999');
  });

  it('updates the page in place when it already exists', async () => {
    const res = await publishComparison({ home, competitors: [rival], config, fetchImpl: fakeFetch('42') });
    expect(res.action).toBe('updated');
    expect(res.pageId).toBe('42');
  });
});
