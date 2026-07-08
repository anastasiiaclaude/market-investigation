import { describe, it, expect, vi } from 'vitest';
import {
  findIssueByLabel,
  createIssue,
  syncGapsToJira,
  type JiraConfig,
} from './jira';
import { basicAuth, AtlassianError } from './atlassian';
import { gapIssueSpecs } from '../../app/src/domain/jira';
import type { Competitor, FeatureArea, Rating } from '../../app/src/domain/competitor';
import { FEATURE_AREAS } from '../../app/src/domain/competitor';

const config: JiraConfig = {
  baseUrl: 'https://site.atlassian.net',
  email: 'me@x.com',
  apiToken: 'tok',
  projectKey: 'KAN',
};

function make(name: string, ratings: Partial<Record<FeatureArea, Rating>>, fallback: Rating = 'adequate'): Competitor {
  const features = Object.fromEntries(FEATURE_AREAS.map((a) => [a, ratings[a] ?? fallback])) as Record<FeatureArea, Rating>;
  return { id: `${name}.example`, name, website: `https://${name}.example/`, description: '', features, updatedAt: '2026-07-08T00:00:00.000Z' };
}

const home = make('VA-INDIGO', { 'quality-analytics': 'weak', alerting: 'absent' }, 'strong');
const rival = make('Rival A', { 'quality-analytics': 'strong', alerting: 'adequate' });

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('basicAuth', () => {
  it('base64-encodes email:token', () => {
    expect(basicAuth('me@x.com', 'tok')).toBe(`Basic ${btoa('me@x.com:tok')}`);
  });
});

describe('findIssueByLabel', () => {
  it('returns the first matching issue key', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ issues: [{ key: 'KAN-5' }] })) as unknown as typeof fetch;
    expect(await findIssueByLabel('mi-gap-alerting', config, fetchImpl)).toBe('KAN-5');
  });

  it('returns null when nothing matches', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ issues: [] })) as unknown as typeof fetch;
    expect(await findIssueByLabel('mi-gap-alerting', config, fetchImpl)).toBeNull();
  });

  it('throws an AtlassianError carrying the status on a non-OK response', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ error: 'nope' }, 429)) as unknown as typeof fetch;
    const err = await findIssueByLabel('x', config, fetchImpl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AtlassianError);
    expect((err as AtlassianError).status).toBe(429);
  });
});

describe('createIssue', () => {
  it('POSTs a v3 issue payload and returns the new key', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return jsonRes({ key: 'KAN-9' }, 201);
    }) as unknown as typeof fetch;

    const [spec] = gapIssueSpecs(home, [rival]);
    const key = await createIssue(spec!, config, fetchImpl);

    expect(key).toBe('KAN-9');
    expect(calls[0]?.url).toBe('https://site.atlassian.net/rest/api/3/issue');
    const body = JSON.parse(String(calls[0]?.init?.body));
    expect(body.fields.project).toEqual({ key: 'KAN' });
    expect(body.fields.issuetype).toEqual({ name: 'Task' });
    expect(body.fields.summary).toContain('Close competitive gap');
    expect(body.fields.description.type).toBe('doc'); // ADF, not a bare string
    expect(body.fields.labels).toContain('market-investigation');
    const authHeader = new Headers(calls[0]?.init?.headers).get('authorization');
    expect(authHeader).toBe(basicAuth(config.email, config.apiToken));
  });

  it('throws an AtlassianError on a non-OK response', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ error: 'bad' }, 400)) as unknown as typeof fetch;
    const [spec] = gapIssueSpecs(home, [rival]);
    await expect(createIssue(spec!, config, fetchImpl)).rejects.toBeInstanceOf(AtlassianError);
  });
});

describe('syncGapsToJira', () => {
  it('creates missing gap issues and skips ones that already exist', async () => {
    // Marker already present for alerting; absent for quality-analytics.
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/search/jql')) {
        const jql = JSON.parse(String(init?.body)).jql as string;
        return jsonRes({ issues: jql.includes('mi-gap-alerting') ? [{ key: 'KAN-2' }] : [] });
      }
      return jsonRes({ key: 'KAN-7' }, 201); // create
    }) as unknown as typeof fetch;

    const result = await syncGapsToJira({ home, competitors: [rival], config, fetchImpl });

    expect(result.created).toEqual([{ area: 'quality-analytics', key: 'KAN-7' }]);
    expect(result.skipped).toEqual([{ area: 'alerting', key: 'KAN-2' }]);
  });

  it('creates nothing when there are no gaps', async () => {
    const fetchImpl = vi.fn(async () => jsonRes({ issues: [] })) as unknown as typeof fetch;
    const strongHome = make('VA-INDIGO', {}, 'strong');
    const result = await syncGapsToJira({ home: strongHome, competitors: [rival], config, fetchImpl });
    expect(result).toEqual({ created: [], skipped: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
