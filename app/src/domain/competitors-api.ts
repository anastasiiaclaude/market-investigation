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
