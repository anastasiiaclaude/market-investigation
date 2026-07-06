import { describe, it, expect, vi } from 'vitest';
import { runResearch, ResearchError } from './research';
import { OPENROUTER_URL } from './openrouter';
import { inMemoryRepo } from './db/in-memory-repo';

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

/** Fake fetch: HTML for the page URL, an OpenRouter completion for the API URL. */
function makeFetch(opts: {
  html?: string;
  pageStatus?: number;
  completion?: unknown;
  completionStatus?: number;
}) {
  const {
    html = '<html><body><h1>Seeq</h1><p>Analytics</p></body></html>',
    pageStatus = 200,
    completion = { choices: [{ message: { content: JSON.stringify(modelReply) } }] },
    completionStatus = 200,
  } = opts;
  return vi.fn(async (url: string | URL) => {
    if (String(url) === OPENROUTER_URL) {
      return new Response(JSON.stringify(completion), {
        status: completionStatus,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(html, { status: pageStatus });
  });
}

const base = {
  url: 'https://www.seeq.com/',
  apiKey: 'sk-test',
  model: 'anthropic/claude-sonnet-4-6',
  now: new Date('2026-07-02T10:00:00.000Z'),
};

describe('runResearch', () => {
  it('returns a Competitor built from the fetched page and model reply', async () => {
    const competitor = await runResearch({ ...base, fetchImpl: makeFetch({}) });
    expect(competitor.name).toBe('Seeq');
    expect(competitor.website).toBe(base.url);
    expect(competitor.description).toBe(modelReply.description);
    expect(competitor.features).toEqual(modelReply.features);
    expect(competitor.updatedAt).toBe('2026-07-02T10:00:00.000Z');
    expect(competitor.id).toBe('seeq.com'); // URL-based identity (M6, ADR 007)
  });

  it('throws ResearchError(502) when the page fetch is not ok', async () => {
    const fetchImpl = makeFetch({ pageStatus: 404 });
    await expect(runResearch({ ...base, fetchImpl })).rejects.toMatchObject({
      name: 'ResearchError',
      status: 502,
    });
  });

  it('throws ResearchError(502) when OpenRouter fails', async () => {
    const fetchImpl = makeFetch({ completionStatus: 500 });
    await expect(runResearch({ ...base, fetchImpl })).rejects.toBeInstanceOf(ResearchError);
  });

  it('throws ResearchError(502) when the model reply is invalid', async () => {
    const fetchImpl = makeFetch({
      completion: { choices: [{ message: { content: '{"name":"x"}' } }] },
    });
    await expect(runResearch({ ...base, fetchImpl })).rejects.toMatchObject({ status: 502 });
  });

  it('persists via the repo and returns the stored competitor when a repo is given', async () => {
    const repo = inMemoryRepo();
    const competitor = await runResearch({ ...base, fetchImpl: makeFetch({}), repo });
    expect(await repo.get(competitor.id)).toEqual(competitor);
  });

  it('dedupes on re-run — two researches of the same URL leave one record (FR-11)', async () => {
    const repo = inMemoryRepo();
    await runResearch({ ...base, fetchImpl: makeFetch({}), repo });
    // Same URL, but the model returns a differently-named result the second time.
    const renamed = { ...modelReply, name: 'Seeq Inc.', description: 'Updated.' };
    await runResearch({
      ...base,
      fetchImpl: makeFetch({ completion: { choices: [{ message: { content: JSON.stringify(renamed) } }] } }),
      repo,
    });

    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0]?.name).toBe('Seeq Inc.'); // the second run updated the first in place
    expect(all[0]?.id).toBe('seeq.com'); // identity stayed the URL key
  });
});
