import { getRepo, DbNotConfiguredError } from './client.js';
import type { CompetitorRepo } from './repository.js';
import type { ServiceResult } from './competitors-service.js';

// Shared glue for the competitor handlers: turn a ServiceResult into a Response,
// and run a service call against the live repo while mapping DB failures to 500.
// Kept tiny so the handlers stay thin (logic lives in the tested service layer).

/** Map a `ServiceResult` to a web-standard `Response` (204/empty → no body). */
export function toResponse(result: ServiceResult): Response {
  if (result.body === undefined) {
    return new Response(null, { status: result.status });
  }
  return Response.json(result.body, { status: result.status });
}

/**
 * Resolve the live repo and run `fn`, translating "DB not configured" to `500`
 * and any query error to `500`. The live path is deploy-verified — tests exercise
 * the service against the in-memory repo instead.
 */
export async function withRepo(
  fn: (repo: CompetitorRepo) => Promise<ServiceResult>,
): Promise<Response> {
  let repo: CompetitorRepo;
  try {
    repo = getRepo();
  } catch (cause) {
    if (cause instanceof DbNotConfiguredError) {
      return Response.json({ error: cause.message }, { status: 500 });
    }
    throw cause;
  }

  try {
    return toResponse(await fn(repo));
  } catch (cause) {
    // Log the real cause server-side; never leak driver internals to the client.
    console.error('Competitor request failed:', cause);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
