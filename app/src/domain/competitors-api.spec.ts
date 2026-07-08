import { describe, it, expect, vi } from 'vitest';
import {
  fetchCompetitors,
  createCompetitor,
  updateCompetitor,
  researchCompetitor,
  syncJiraGaps,
  publishConfluence,
  COMPETITORS_ENDPOINT,
  RESEARCH_ENDPOINT,
  JIRA_ENDPOINT,
  CONFLUENCE_ENDPOINT,
} from './competitors-api';
import { ApiError } from './api-error';
import type { Competitor } from './competitor';

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

/** A fake `fetch` returning the given body/status for COMPETITORS_ENDPOINT. */
function stubFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    expect(String(input)).toBe(COMPETITORS_ENDPOINT);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

describe('fetchCompetitors', () => {
  it('returns validated competitors for a 200 array response', async () => {
    const result = await fetchCompetitors(stubFetch([seeq]));
    expect(result).toEqual([seeq]);
  });

  it('returns an empty array for a valid empty response', async () => {
    expect(await fetchCompetitors(stubFetch([]))).toEqual([]);
  });

  it('throws an ApiError on a non-OK status (a real server error)', async () => {
    await expect(
      fetchCompetitors(stubFetch({ error: 'boom' }, 500)),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('throws a non-ApiError on a shape failure (the dev-fallback signal)', async () => {
    const err = await fetchCompetitors(stubFetch({ not: 'an array' })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ApiError);
  });

  it('throws when a row fails schema validation', async () => {
    await expect(
      fetchCompetitors(stubFetch([{ ...seeq, website: 'not-a-url' }])),
    ).rejects.toThrow();
  });
});

/** Capture the request a write makes, and reply with the given body/status. */
function recordingFetch(body: unknown, status: number) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('createCompetitor', () => {
  it('POSTs the competitor and returns the validated upserted record', async () => {
    const { impl, calls } = recordingFetch(seeq, 201);
    const result = await createCompetitor(seeq, impl);

    expect(result).toEqual(seeq);
    expect(calls[0]?.url).toBe(COMPETITORS_ENDPOINT);
    expect(calls[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(seeq);
  });

  it('throws an ApiError on a non-OK status', async () => {
    const { impl } = recordingFetch({ error: 'bad' }, 400);
    await expect(createCompetitor(seeq, impl)).rejects.toBeInstanceOf(ApiError);
  });

  it('throws when the returned row fails schema validation', async () => {
    const { impl } = recordingFetch({ ...seeq, website: 'not-a-url' }, 201);
    await expect(createCompetitor(seeq, impl)).rejects.toThrow();
  });
});

describe('updateCompetitor', () => {
  it('PUTs to the encoded ?id= route and returns the updated record', async () => {
    const { impl, calls } = recordingFetch(seeq, 200);
    const result = await updateCompetitor(seeq.id, { name: 'Seeq' }, impl);

    expect(result).toEqual(seeq);
    expect(calls[0]?.url).toBe(`${COMPETITORS_ENDPOINT}?id=${encodeURIComponent(seeq.id)}`);
    expect(calls[0]?.init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ name: 'Seeq' });
  });

  it('encodes an id containing slashes and query chars', async () => {
    const { impl, calls } = recordingFetch(seeq, 200);
    await updateCompetitor('acme.io/product?x=1', {}, impl);
    expect(calls[0]?.url).toBe(
      `${COMPETITORS_ENDPOINT}?id=${encodeURIComponent('acme.io/product?x=1')}`,
    );
  });

  it('throws an ApiError on a non-OK status (e.g. 404)', async () => {
    const { impl } = recordingFetch({ error: 'missing' }, 404);
    await expect(updateCompetitor(seeq.id, {}, impl)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('researchCompetitor', () => {
  it('POSTs the url to the research endpoint and returns the validated record', async () => {
    const { impl, calls } = recordingFetch(seeq, 200);
    const result = await researchCompetitor('https://www.seeq.com/', impl);

    expect(result).toEqual(seeq);
    expect(calls[0]?.url).toBe(RESEARCH_ENDPOINT);
    expect(calls[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ url: 'https://www.seeq.com/' });
  });

  it('throws a retryable ApiError on a 429 rate limit', async () => {
    const { impl } = recordingFetch({ error: 'rate limited' }, 429);
    const err = await researchCompetitor('https://x.example/', impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(429);
    expect((err as ApiError).retryable).toBe(true);
  });

  it('throws when the returned record fails schema validation', async () => {
    const { impl } = recordingFetch({ ...seeq, website: 'not-a-url' }, 200);
    await expect(researchCompetitor('https://x.example/', impl)).rejects.toThrow();
  });
});

describe('syncJiraGaps', () => {
  const result = { created: [{ area: 'alerting', key: 'KAN-1' }], skipped: [] };

  it('POSTs { home, competitors } to the Jira endpoint and returns the result', async () => {
    const { impl, calls } = recordingFetch(result, 200);
    const got = await syncJiraGaps(seeq, [seeq], impl);

    expect(got).toEqual(result);
    expect(calls[0]?.url).toBe(JIRA_ENDPOINT);
    expect(calls[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ home: seeq, competitors: [seeq] });
  });

  it('throws a retryable ApiError on a 429 rate limit', async () => {
    const { impl } = recordingFetch({ error: 'rate limited' }, 429);
    const err = await syncJiraGaps(seeq, [seeq], impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).retryable).toBe(true);
  });
});

describe('publishConfluence', () => {
  const result = { pageId: '999', url: 'https://site/wiki/p/1', action: 'created' as const };

  it('POSTs { home, competitors } to the Confluence endpoint and returns the result', async () => {
    const { impl, calls } = recordingFetch(result, 200);
    const got = await publishConfluence(seeq, [seeq], impl);

    expect(got).toEqual(result);
    expect(calls[0]?.url).toBe(CONFLUENCE_ENDPOINT);
    expect(calls[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ home: seeq, competitors: [seeq] });
  });

  it('throws a retryable ApiError on a 429 rate limit', async () => {
    const { impl } = recordingFetch({ error: 'rate limited' }, 429);
    const err = await publishConfluence(seeq, [seeq], impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).retryable).toBe(true);
  });
});
