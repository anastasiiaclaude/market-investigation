import type { CompetitorRepo } from './repository';
import { parseCompetitor, type Competitor } from '../../../app/src/domain/competitor';

/**
 * CRUD controllers for competitors (M6). Pure over an injected `CompetitorRepo`:
 * each returns a status + JSON body, and handlers turn that into a `Response`.
 * All validation reuses the domain `competitorSchema`, so the API can never
 * persist a malformed record. Tested against the in-memory repo (no DB).
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
  return { status: 201, body: await repo.upsert(competitor) };
}

export async function updateCompetitor(
  repo: CompetitorRepo,
  id: string,
  patch: unknown,
): Promise<ServiceResult> {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return { status: 400, body: { error: 'Body must be a competitor patch object' } };
  }
  let updated: Competitor | null;
  try {
    updated = await repo.update(id, patch as Partial<Competitor>);
  } catch (cause) {
    // The merged record failed validation (e.g. an invalid rating in the patch).
    return { status: 400, body: { error: `Invalid competitor: ${(cause as Error).message}` } };
  }
  return updated ? { status: 200, body: updated } : notFound(id);
}

export async function deleteCompetitor(repo: CompetitorRepo, id: string): Promise<ServiceResult> {
  const removed = await repo.remove(id);
  return removed ? { status: 204 } : notFound(id);
}
