import type { CompetitorRepo } from './repository.js';
import { parseCompetitor, type Competitor } from '../../../app/src/domain/competitor.js';

/**
 * In-memory `CompetitorRepo` for node-only tests (M6). Same upsert/dedup
 * semantics as the Postgres impl — keyed by `id` (the URL key) — so tests can
 * assert dedup, CRUD, and seed idempotency without a database.
 */
export function inMemoryRepo(seed: Competitor[] = []): CompetitorRepo {
  const store = new Map<string, Competitor>();
  for (const c of seed) store.set(c.id, c);

  const repo: CompetitorRepo = {
    async list() {
      return [...store.values()];
    },

    async get(id) {
      return store.get(id) ?? null;
    },

    async upsert(competitor) {
      const valid = parseCompetitor(competitor);
      store.set(valid.id, valid);
      return valid;
    },

    async remove(id) {
      return store.delete(id);
    },
  };
  return repo;
}
