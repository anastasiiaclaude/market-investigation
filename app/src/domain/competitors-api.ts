import { competitorSchema, type Competitor } from './competitor';
import { apiError, networkError } from './api-error';
import { jiraSyncResultSchema, type JiraSyncResult } from './jira';
import { confluencePublishResultSchema, type ConfluencePublishResult } from './confluence';

export type { JiraSyncResult, ConfluencePublishResult };

/**
 * Read-path client for persisted competitors (M6 Part B, FR-10). Pure over an
 * injectable `fetch` so it is node-testable without a browser or a running
 * server — the same seam pattern as `view-preference`/`useViewPreference`.
 *
 * Throws on any failure (network, non-OK status, non-array body, or a row that
 * fails `competitorSchema`); the `useCompetitors` hook turns a throw into the
 * mock fallback. A valid empty array is a success, not a failure — it flows
 * through as `[]` so the UI can show a distinct empty state.
 */
export const COMPETITORS_ENDPOINT = '/api/competitors';

export async function fetchCompetitors(
  fetchImpl: typeof fetch = fetch,
): Promise<Competitor[]> {
  const res = await fetchImpl(COMPETITORS_ENDPOINT);
  // A non-OK status is a real server error → an ApiError (the hook shows it +
  // offers retry). A parse/shape failure below throws a plain Error instead — the
  // vite-dev signature (`/api` serves index.html) → the mock "sample data"
  // fallback. `useCompetitors` branches on the error type.
  if (!res.ok) {
    throw await apiError(res);
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`GET ${COMPETITORS_ENDPOINT} did not return an array`);
  }

  return data.map((item) => competitorSchema.parse(item));
}

/**
 * Write-path client for the form (M7, FR-5/FR-6). Mirror of `fetchCompetitors`:
 * injectable `fetch`, validates the returned row against `competitorSchema`, and
 * throws on a non-OK status so the caller can keep the dialog open with an error.
 * The API returns the upserted record; the caller merges it into the list
 * (`useCompetitors.upsert`) rather than refetching.
 */
const JSON_HEADERS = { 'content-type': 'application/json' };

/** Await a fetch, converting a `fetch` rejection (offline/DNS) into an ApiError. */
async function send(
  fetchImpl: typeof fetch,
  input: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetchImpl(input, init);
  } catch {
    throw networkError();
  }
}

async function parseWritten(res: Response): Promise<Competitor> {
  if (!res.ok) {
    throw await apiError(res);
  }
  return competitorSchema.parse(await res.json());
}

/** POST a new competitor → the upserted record (`201`). */
export async function createCompetitor(
  competitor: Competitor,
  fetchImpl: typeof fetch = fetch,
): Promise<Competitor> {
  const res = await send(fetchImpl, COMPETITORS_ENDPOINT, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(competitor),
  });
  return parseWritten(res);
}

/**
 * PUT changes to an existing competitor → the updated record (`200`). The id is
 * a URL key (slashes, query chars), so it is encoded into the `?id=` param.
 */
export async function updateCompetitor(
  id: string,
  patch: Partial<Competitor>,
  fetchImpl: typeof fetch = fetch,
): Promise<Competitor> {
  const res = await send(fetchImpl, `${COMPETITORS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
  return parseWritten(res);
}

/**
 * Research-path client (M8, FR-16 — the frontend for M5's `POST /api/research`).
 * Posts a competitor URL; the backend fetches + summarizes it and returns the
 * persisted `Competitor`. A non-OK status becomes an `ApiError` (429 → a friendly
 * rate-limit message), so the research UI can show it inline and offer a retry.
 */
export const RESEARCH_ENDPOINT = '/api/research';

export async function researchCompetitor(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Competitor> {
  const res = await send(fetchImpl, RESEARCH_ENDPOINT, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    throw await apiError(res);
  }
  return competitorSchema.parse(await res.json());
}

/**
 * Push competitive gaps to Jira (M8, FR-14 — ADR 008). Sends the home product +
 * competitors; the server computes the gaps, files one Task each (deduped), and
 * returns which were created vs already existed. A non-OK status becomes an
 * `ApiError` (429 → friendly), so the button surfaces a graceful message.
 */
export const JIRA_ENDPOINT = '/api/jira';

export async function syncJiraGaps(
  home: Competitor,
  competitors: Competitor[],
  fetchImpl: typeof fetch = fetch,
): Promise<JiraSyncResult> {
  const res = await send(fetchImpl, JIRA_ENDPOINT, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ home, competitors }),
  });
  if (!res.ok) {
    throw await apiError(res);
  }
  return jiraSyncResultSchema.parse(await res.json());
}

/**
 * Publish the comparison to Confluence (M8, FR-15 — ADR 008). Sends the home
 * product + competitors; the server renders the page and creates-or-updates the
 * canonical page, returning its id, url, and whether it was created or updated.
 */
export const CONFLUENCE_ENDPOINT = '/api/confluence';

export async function publishConfluence(
  home: Competitor,
  competitors: Competitor[],
  fetchImpl: typeof fetch = fetch,
): Promise<ConfluencePublishResult> {
  const res = await send(fetchImpl, CONFLUENCE_ENDPOINT, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ home, competitors }),
  });
  if (!res.ok) {
    throw await apiError(res);
  }
  return confluencePublishResultSchema.parse(await res.json());
}
