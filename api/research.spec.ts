import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from './research';
import { OPENROUTER_URL } from './_lib/openrouter';

const modelReply = {
  name: 'Seeq',
  description: 'Advanced analytics for time-series process data.',
  features: {
    'realtime-dashboards': 'weak',
    'data-integration': 'adequate',
    'trend-analytics': 'strong',
    'quality-analytics': 'adequate',
    alerting: 'weak',
    reporting: 'strong',
  },
};

function stubFetch() {
  const fetchImpl = vi.fn(async (url: string | URL) => {
    if (String(url) === OPENROUTER_URL) {
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelReply) } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('<html><body><p>Seeq</p></body></html>', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchImpl);
  return fetchImpl;
}

function post(body: unknown, raw = false): Request {
  return new Request('http://localhost/api/research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('POST /api/research', () => {
  it('returns 200 with a Competitor for a valid url', async () => {
    const fetchImpl = stubFetch();
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-test');

    const res = await POST(post({ url: 'https://www.seeq.com/' }));
    expect(res.status).toBe(200);
    const competitor = await res.json();
    expect(competitor.name).toBe('Seeq');
    expect(competitor.website).toBe('https://www.seeq.com/');
    expect(competitor.features).toEqual(modelReply.features);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('returns 400 when the body is not valid JSON', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-test');
    const res = await POST(post('not json{', true));
    expect(res.status).toBe(400);
  });

  it('returns 400 when url is missing or not a valid http(s) url', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-test');
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post({ url: 'not-a-url' }))).status).toBe(400);
    expect((await POST(post({ url: 'ftp://example.com' }))).status).toBe(400);
  });

  it('returns 500 when OPENROUTER_API_KEY is not configured', async () => {
    stubFetch();
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const res = await POST(post({ url: 'https://www.seeq.com/' }));
    expect(res.status).toBe(500);
  });

  it('does not call the network when the api key is missing', async () => {
    const fetchImpl = stubFetch();
    vi.stubEnv('OPENROUTER_API_KEY', '');
    await POST(post({ url: 'https://www.seeq.com/' }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 502 when the upstream page fetch fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 503 }));
    vi.stubGlobal('fetch', fetchImpl);
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-test');
    const res = await POST(post({ url: 'https://down.example.com/' }));
    expect(res.status).toBe(502);
  });
});
