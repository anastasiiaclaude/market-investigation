import { describe, it, expect, vi } from 'vitest';
import { fetchCompetitors, COMPETITORS_ENDPOINT } from './competitors-api';
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
