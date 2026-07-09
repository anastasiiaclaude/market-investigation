import type { CompetitorRepo } from './repository.js';
import { parseCompetitor, type Competitor } from '../../../app/src/domain/competitor.js';
import { websiteKey } from '../../../app/src/domain/identity.js';

/**
 * CRUD controllers for competitors (M6). Pure over an injected `CompetitorRepo`:
 * each returns a status + JSON body, and handlers turn that into a `Response`.
 * All validation reuses the domain `competitorSchema`, so the API can never
 * persist a malformed record. Tested against the in-memory repo (no DB).
 *
 * Merge + validation live here (not in the repo) so a validation failure is a
 * clean 400 while any DB error from `get`/`upsert` propagates to the handler's
 * 500 mapping — the two must not be conflated. The URL-identity invariant
 * (`id === websiteKey(website)`, the basis of FR-11 dedup) is enforced on every
 * write, so a client can never persist a record under a mismatched id.
 */
export interface ServiceResult {
  status: number;
  /** JSON body, or `undefined` for an empty response (e.g. 204). */
  body?: unknown;
}

const notFound = (id: string): ServiceResult => ({
  status: 404,
  body: { error: `No competitor with id "${id}"` },
});

export async function listCompetitors(repo: CompetitorRepo): Promise<ServiceResult> {
  return { status: 200, body: await repo.list() };
}

export async function getCompetitor(repo: CompetitorRepo, id: string): Promise<ServiceResult> {
  const competitor = await repo.get(id);
  return competitor ? { status: 200, body: competitor } : notFound(id);
}

export async function createCompetitor(
  repo: CompetitorRepo,
  input: unknown,
): Promise<ServiceResult> {
  let competitor: Competitor;
  try {
    competitor = parseCompetitor(input);
  } catch (cause) {
    return { status: 400, body: { error: `Invalid competitor: ${(cause as Error).message}` } };
  }
  // The id is always the URL key, never client-chosen — otherwise a mismatched
  // id could later duplicate a site that research inserts under its true key.
  const keyed = { ...competitor, id: websiteKey(competitor.website) };
  return { status: 201, body: await repo.upsert(keyed) };
}

export async function updateCompetitor(
  repo: CompetitorRepo,
  id: string,
  patch: unknown,
): Promise<ServiceResult> {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return { status: 400, body: { error: 'Body must be a competitor patch object' } };
  }

  const existing = await repo.get(id); // a DB failure here propagates → 500
  if (!existing) return notFound(id);

  let merged: Competitor;
  try {
    // `id` stays fixed so identity is immutable even if the patch tries to set it.
    merged = parseCompetitor({ ...existing, ...patch, id });
  } catch (cause) {
    return { status: 400, body: { error: `Invalid competitor: ${(cause as Error).message}` } };
  }
  // A website edit that would change the URL key would break dedup — reject it.
  if (websiteKey(merged.website) !== id) {
    return {
      status: 400,
      body: { error: 'Changing website would change the competitor id; delete and re-create instead' },
    };
  }

  return { status: 200, body: await repo.upsert(merged) }; // a DB failure here propagates → 500
}

export async function deleteCompetitor(repo: CompetitorRepo, id: string): Promise<ServiceResult> {
  const removed = await repo.remove(id);
  return removed ? { status: 204 } : notFound(id);
}
