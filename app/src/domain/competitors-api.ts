import { competitorSchema, type Competitor } from './competitor';

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
  if (!res.ok) {
    throw new Error(`GET ${COMPETITORS_ENDPOINT} failed with status ${res.status}`);
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

async function parseWritten(res: Response, method: string): Promise<Competitor> {
  if (!res.ok) {
    throw new Error(`${method} ${COMPETITORS_ENDPOINT} failed with status ${res.status}`);
  }
  return competitorSchema.parse(await res.json());
}

/** POST a new competitor → the upserted record (`201`). */
export async function createCompetitor(
  competitor: Competitor,
  fetchImpl: typeof fetch = fetch,
): Promise<Competitor> {
  const res = await fetchImpl(COMPETITORS_ENDPOINT, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(competitor),
  });
  return parseWritten(res, 'POST');
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
  const res = await fetchImpl(`${COMPETITORS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
  return parseWritten(res, 'PUT');
}
