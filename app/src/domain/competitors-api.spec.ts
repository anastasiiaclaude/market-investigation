import { describe, it, expect, vi } from 'vitest';
import {
  fetchCompetitors,
  createCompetitor,
  updateCompetitor,
  COMPETITORS_ENDPOINT,
} from './competitors-api';
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

  it('throws on a non-OK status', async () => {
    await expect(fetchCompetitors(stubFetch({ error: 'boom' }, 500))).rejects.toThrow();
  });

  it('throws when the body is not an array', async () => {
    await expect(fetchCompetitors(stubFetch({ not: 'an array' }))).rejects.toThrow();
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

  it('throws on a non-OK status', async () => {
    const { impl } = recordingFetch({ error: 'bad' }, 400);
    await expect(createCompetitor(seeq, impl)).rejects.toThrow();
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

  it('throws on a non-OK status (e.g. 404)', async () => {
    const { impl } = recordingFetch({ error: 'missing' }, 404);
    await expect(updateCompetitor(seeq.id, {}, impl)).rejects.toThrow();
  });
});
