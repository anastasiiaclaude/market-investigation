import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from './jira';
import { FEATURE_AREAS } from '../app/src/domain/competitor';
import type { Competitor, FeatureArea, Rating } from '../app/src/domain/competitor';

function make(name: string, ratings: Partial<Record<FeatureArea, Rating>>, fallback: Rating = 'adequate'): Competitor {
  const features = Object.fromEntries(FEATURE_AREAS.map((a) => [a, ratings[a] ?? fallback])) as Record<FeatureArea, Rating>;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  // Handler validates via competitorSchema, so URLs must be schema-valid.
  return { id: `${slug}.example.com`, name, website: `https://${slug}.example.com/`, description: '', features, updatedAt: '2026-07-08T00:00:00.000Z' };
}

const home = make('VA-INDIGO', { 'quality-analytics': 'weak', alerting: 'absent' }, 'strong');
const rival = make('Rival A', { 'quality-analytics': 'strong', alerting: 'adequate' });

/** Fake Jira: search finds nothing (→ create), create returns a key. */
function stubFetch(createStatus = 201) {
  const fetchImpl = vi.fn(async (url: string | URL) => {
    if (String(url).endsWith('/search/jql')) {
      return new Response(JSON.stringify({ issues: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ key: 'KAN-1' }), { status: createStatus, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchImpl);
  return fetchImpl;
}

function configureEnv() {
  vi.stubEnv('ATLASSIAN_BASE_URL', 'https://site.atlassian.net');
  vi.stubEnv('ATLASSIAN_EMAIL', 'me@x.com');
  vi.stubEnv('ATLASSIAN_API_TOKEN', 'tok');
  vi.stubEnv('JIRA_PROJECT_KEY', 'KAN');
}

function post(body: unknown, raw = false): Request {
  return new Request('http://localhost/api/jira', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('POST /api/jira', () => {
  it('creates a Task per gap and returns created/skipped', async () => {
    stubFetch();
    configureEnv();
    const res = await POST(post({ home, competitors: [rival] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toEqual([
      { area: 'quality-analytics', key: 'KAN-1' },
      { area: 'alerting', key: 'KAN-1' },
    ]);
    expect(body.skipped).toEqual([]);
  });

  it('returns 400 when the body is not valid JSON', async () => {
    configureEnv();
    expect((await POST(post('not json{', true))).status).toBe(400);
  });

  it('returns 400 when the body fails validation', async () => {
    configureEnv();
    expect((await POST(post({ competitors: [rival] }))).status).toBe(400); // no home
    expect((await POST(post({ home, competitors: 'nope' }))).status).toBe(400);
  });

  it('returns 500 when Atlassian is not configured', async () => {
    stubFetch();
    vi.stubEnv('ATLASSIAN_BASE_URL', '');
    const res = await POST(post({ home, competitors: [rival] }));
    expect(res.status).toBe(500);
  });

  it('forwards an upstream status (e.g. 429) from a create failure', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      if (String(url).endsWith('/search/jql')) {
        return new Response(JSON.stringify({ issues: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 });
    });
    vi.stubGlobal('fetch', fetchImpl);
    configureEnv();
    const res = await POST(post({ home, competitors: [rival] }));
    expect(res.status).toBe(429);
  });
});
