// Scheduled-research orchestration (M8, FR-12). Re-runs the research pipeline over
// every saved competitor and refreshes the DB. Pure over an injectable `fetchImpl`
// + `repo`, so it is node-tested against the in-memory repo — the cron handler
// (api/cron.ts) is the thin Vercel entry point.

import { runResearch } from './research.js';
import { assertPublicUrl } from './url-guard.js';
import type { CompetitorRepo } from './db/repository.js';

export interface RefreshResult {
  /** ids (URL keys) successfully re-researched + upserted. */
  refreshed: string[];
  /** ids that failed, with the reason — the batch continues past each. */
  failed: { id: string; error: string }[];
}

/**
 * Re-research every saved competitor by its website and upsert the result (dedup
 * by `websiteKey`, so rows update in place). Failure is isolated per competitor —
 * one bad fetch or an OpenRouter `429` is recorded and the loop continues, so a
 * single flaky site can't sink the whole daily run. The next run retries it.
 */
export async function refreshAllCompetitors(opts: {
  repo: CompetitorRepo;
  apiKey: string;
  model: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to now inside `runResearch`. */
  now?: Date;
}): Promise<RefreshResult> {
  const { repo, apiKey, model, fetchImpl = fetch, now } = opts;
  const result: RefreshResult = { refreshed: [], failed: [] };

  for (const competitor of await repo.list()) {
    try {
      // Re-apply the SSRF guard: stored websites are attacker-influencable (writes
      // are open, #25) and cron fetches them unprompted, so re-check before every
      // fetch — a blocked host is recorded as a per-item failure, not a throw.
      assertPublicUrl(competitor.website);
      await runResearch({ url: competitor.website, apiKey, model, fetchImpl, now, repo });
      result.refreshed.push(competitor.id);
    } catch (cause) {
      result.failed.push({ id: competitor.id, error: (cause as Error).message });
    }
  }

  return result;
}
