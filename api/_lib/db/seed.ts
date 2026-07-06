import type { CompetitorRepo } from './repository';
import { websiteKey } from '../../../app/src/domain/identity';
import type { Competitor } from '../../../app/src/domain/competitor';

/**
 * Seed competitors into a repo (M6). Idempotent: each record is upserted under
 * its URL-key id, so running the seed twice leaves the same rows. Mock records
 * are re-keyed by `websiteKey(website)` so seeded competitors share the exact
 * identity scheme that research produces — a later research of the same site
 * dedupes against the seed instead of duplicating it.
 */
export async function seed(
  repo: CompetitorRepo,
  competitors: readonly Competitor[],
): Promise<Competitor[]> {
  const results: Competitor[] = [];
  for (const competitor of competitors) {
    results.push(await repo.upsert({ ...competitor, id: websiteKey(competitor.website) }));
  }
  return results;
}
