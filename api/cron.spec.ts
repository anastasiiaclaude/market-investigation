import { describe, it, expect, vi, afterEach } from 'vitest';
import { GET } from './cron.js';

// Node-only test: mock the DB client so no real Neon connection is needed.
vi.mock('./_lib/db/client.js', async () => {
  const { inMemoryRepo } = await import('./_lib/db/in-memory-repo.js');
  const repo = inMemoryRepo();
  return {
    getRepo: () => repo,
    DbNotConfiguredError: class DbNotConfiguredError extends Error {},
  };
});

const SECRET = 'cron-secret';

function get(authorization?: string): Request {
  return new Request('http://localhost/api/cron', {
    headers: authorization ? { authorization } : {},
  });
}

function configureEnv() {
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.stubEnv('OPENROUTER_API_KEY', 'sk-test');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('GET /api/cron', () => {
  it('returns 401 without a valid bearer, and never calls the network', async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal('fetch', fetchImpl);
    configureEnv();

    expect((await GET(get())).status).toBe(401);
    expect((await GET(get('Bearer wrong'))).status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns 500 when CRON_SECRET is not configured', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-test');
    expect((await GET(get(`Bearer ${SECRET}`))).status).toBe(500);
  });

  it('returns 500 when OPENROUTER_API_KEY is not configured', async () => {
    vi.stubEnv('CRON_SECRET', SECRET);
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect((await GET(get(`Bearer ${SECRET}`))).status).toBe(500);
  });

  it('returns 200 with a refresh summary for an authorized request', async () => {
    configureEnv();
    const res = await GET(get(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ refreshed: [], failed: [] });
  });
});
