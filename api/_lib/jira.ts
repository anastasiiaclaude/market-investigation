// Jira REST orchestration (M8, FR-14 — ADR 008). Turns competitive gaps into
// Task issues in the configured project, deduped by a marker label so re-runs
// don't spam. Web-standard `fetch` + Basic auth — no SDK, mirroring OpenRouter.
// The pure gap→spec mapping lives in app/src/domain/jira.ts; this file is the I/O.

import { gapIssueSpecs, type JiraIssueSpec, type JiraSyncResult } from '../../app/src/domain/jira';
import type { Competitor } from '../../app/src/domain/competitor';
import { AtlassianError, basicAuth } from './atlassian';

export interface JiraConfig {
  /** e.g. https://your-site.atlassian.net */
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

function headers(config: JiraConfig): Record<string, string> {
  return {
    authorization: basicAuth(config.email, config.apiToken),
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

/**
 * Find an existing issue carrying `markerLabel` in the project; return its key or
 * `null`. Uses the current `POST /rest/api/3/search/jql` endpoint.
 */
export async function findIssueByLabel(
  markerLabel: string,
  config: JiraConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  // Match by label irrespective of status (deliberate): once a gap has an issue
  // we never re-file it, even if that issue was later closed. Dedup is by
  // presence, not open-ness — don't narrow this with a status clause.
  const jql = `project = "${config.projectKey}" AND labels = "${markerLabel}"`;
  const res = await fetchImpl(`${config.baseUrl}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ jql, maxResults: 1, fields: ['key'] }),
  });
  if (!res.ok) {
    throw new AtlassianError(`Jira search failed (status ${res.status})`, res.status);
  }
  const data = (await res.json()) as { issues?: Array<{ key?: string }> };
  return data.issues?.[0]?.key ?? null;
}

/** Create one Task from a spec; return the new issue key. */
export async function createIssue(
  spec: JiraIssueSpec,
  config: JiraConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${config.baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({
      fields: {
        project: { key: config.projectKey },
        issuetype: { name: 'Task' },
        summary: spec.summary,
        description: spec.description,
        labels: spec.labels,
      },
    }),
  });
  if (!res.ok) {
    throw new AtlassianError(`Jira issue create failed (status ${res.status})`, res.status);
  }
  const data = (await res.json()) as { key?: string };
  if (!data.key) {
    throw new AtlassianError('Jira create returned no issue key', 502);
  }
  return data.key;
}

/**
 * File a Jira Task for every gap that doesn't already have one. Idempotent: a gap
 * whose marker label is already present is reported under `skipped`. Errors
 * propagate as `AtlassianError`; because creation is dedup-guarded, retrying after
 * a mid-run failure re-skips what was already created.
 */
export async function syncGapsToJira(opts: {
  home: Competitor;
  competitors: Competitor[];
  config: JiraConfig;
  fetchImpl?: typeof fetch;
}): Promise<JiraSyncResult> {
  const { home, competitors, config, fetchImpl = fetch } = opts;
  const result: JiraSyncResult = { created: [], skipped: [] };

  for (const spec of gapIssueSpecs(home, competitors)) {
    const existing = await findIssueByLabel(spec.markerLabel, config, fetchImpl);
    if (existing) {
      result.skipped.push({ area: spec.area, key: existing });
      continue;
    }
    const key = await createIssue(spec, config, fetchImpl);
    result.created.push({ area: spec.area, key });
  }

  return result;
}
