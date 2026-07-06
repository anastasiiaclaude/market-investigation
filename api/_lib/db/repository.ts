import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { competitors, type CompetitorRow } from './schema';
import { parseCompetitor, type Competitor } from '../../../app/src/domain/competitor';

/**
 * Data-access seam for competitors (M6, ADR 007). Everything that touches the
 * store goes through this interface, so controllers and `runResearch` depend on
 * the abstraction, not on Postgres. Production uses `drizzleRepo`; node-only
 * tests use the in-memory implementation. This mirrors M5's injectable
 * `fetchImpl` — no test ever touches a real database.
 */
export interface CompetitorRepo {
  /** All competitors (capped), in insertion-independent order. */
  list(): Promise<Competitor[]>;
  /** One competitor by id (URL key), or `null` if absent. */
  get(id: string): Promise<Competitor | null>;
  /** Insert, or update in place when a competitor with the same id exists. */
  upsert(competitor: Competitor): Promise<Competitor>;
  /** Delete by id; `true` if a row was removed, `false` if none matched. */
  remove(id: string): Promise<boolean>;
}

/** Safety cap on `list` so the read path can't fetch an unbounded result set. */
export const LIST_LIMIT = 500;

/** Validate a DB row as a domain `Competitor` (single source of truth on read). */
export function rowToCompetitor(row: CompetitorRow): Competitor {
  return parseCompetitor(row);
}

/** The mutable columns an upsert/update writes (everything except the id key). */
function mutableColumns(competitor: Competitor) {
  return {
    name: competitor.name,
    website: competitor.website,
    description: competitor.description,
    features: competitor.features,
    updatedAt: competitor.updatedAt,
  };
}

type Db = NeonHttpDatabase<Record<string, never>>;

/** Postgres-backed repository (thin; deploy-verified, not unit-tested). */
export function drizzleRepo(db: Db): CompetitorRepo {
  const repo: CompetitorRepo = {
    async list() {
      const rows = await db.select().from(competitors).limit(LIST_LIMIT);
      return rows.map(rowToCompetitor);
    },

    async get(id) {
      const rows = await db.select().from(competitors).where(eq(competitors.id, id)).limit(1);
      const row = rows[0];
      return row ? rowToCompetitor(row) : null;
    },

    async upsert(competitor) {
      const rows = await db
        .insert(competitors)
        .values(competitor)
        .onConflictDoUpdate({ target: competitors.id, set: mutableColumns(competitor) })
        .returning();
      const row = rows[0];
      if (!row) throw new Error('upsert returned no row');
      return rowToCompetitor(row);
    },

    async remove(id) {
      const rows = await db
        .delete(competitors)
        .where(eq(competitors.id, id))
        .returning({ id: competitors.id });
      return rows.length > 0;
    },
  };
  return repo;
}
