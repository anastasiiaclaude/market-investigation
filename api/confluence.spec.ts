import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from './confluence';
import { COMPARISON_PAGE_TITLE } from '../app/src/domain/confluence';
import { FEATURE_AREAS } from '../app/src/domain/competitor';
import type { Competitor, FeatureArea, Rating } from '../app/src/domain/competitor';

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

/** Route the publish sequence; existingPageId=null → create, else update. */
function stubFetch(existingPageId: string | null) {
  const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    if (u.includes('/api/v2/spaces?keys=')) return jsonRes({ results: [{ id: '688132' }] });
    if (u.includes('/api/v2/pages?space-id=')) {
      return jsonRes({ results: existingPageId ? [{ id: existingPageId, title: COMPARISON_PAGE_TITLE }] : [] });
    }
    if (method === 'GET') return jsonRes({ id: existingPageId, version: { number: 2 } });
    return jsonRes({ id: existingPageId ?? '999', _links: { webui: '/p/1' } });
  });
  vi.stubGlobal('fetch', fetchImpl);
  return fetchImpl;
}

function configureEnv() {
  vi.stubEnv('ATLASSIAN_BASE_URL', 'https://site.atlassian.net');
  vi.stubEnv('ATLASSIAN_EMAIL', 'me@x.com');
  vi.stubEnv('ATLASSIAN_API_TOKEN', 'tok');
  vi.stubEnv('CONFLUENCE_SPACE_KEY', 'SOFTWAREEN');
}

function post(body: unknown, raw = false): Request {
  return new Request('http://localhost/api/confluence', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('POST /api/confluence', () => {
  it('creates the page and returns action=created', async () => {
    stubFetch(null);
    configureEnv();
    const res = await POST(post({ home, competitors: [rival] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe('created');
    expect(body.pageId).toBe('999');
  });

  it('updates the page when it already exists (action=updated)', async () => {
    stubFetch('42');
    configureEnv();
    const body = await (await POST(post({ home, competitors: [rival] }))).json();
    expect(body.action).toBe('updated');
    expect(body.pageId).toBe('42');
  });

  it('returns 400 for invalid JSON or body', async () => {
    configureEnv();
    expect((await POST(post('nope{', true))).status).toBe(400);
    expect((await POST(post({ competitors: [rival] }))).status).toBe(400);
  });

  it('returns 500 when Atlassian is not configured', async () => {
    stubFetch(null);
    vi.stubEnv('ATLASSIAN_BASE_URL', '');
    expect((await POST(post({ home, competitors: [rival] }))).status).toBe(500);
  });

  it('forwards an upstream status (e.g. 429)', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ error: 'rate limited' }, 429));
    vi.stubGlobal('fetch', fetchImpl);
    configureEnv();
    expect((await POST(post({ home, competitors: [rival] }))).status).toBe(429);
  });
});
