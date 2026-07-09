import { withRepo } from './_lib/db/handler-support.js';
import {
  listCompetitors,
  getCompetitor,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
} from './_lib/db/competitors-service.js';

// Vercel Function — `/api/competitors` (M6, feature 007). Web-standard handlers
// (no runtime dependency), mirroring api/health.ts and api/research.ts. By-id
// operations take the id as `?id=` because the id is a URL key containing
// slashes, which a path segment cannot carry cleanly.

const missingId = (): Response =>
  Response.json({ error: 'Query param "id" is required' }, { status: 400 });

const badJson = (): Response =>
  Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });

function idOf(req: Request): string | null {
  return new URL(req.url).searchParams.get('id');
}

async function readJson(req: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await req.json() };
  } catch {
    return { ok: false };
  }
}

export function GET(req: Request): Promise<Response> {
  const id = idOf(req);
  return withRepo((repo) => (id === null ? listCompetitors(repo) : getCompetitor(repo, id)));
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJson(req);
  if (!body.ok) return badJson();
  return withRepo((repo) => createCompetitor(repo, body.value));
}

export async function PUT(req: Request): Promise<Response> {
  const id = idOf(req);
  if (id === null) return missingId();
  const body = await readJson(req);
  if (!body.ok) return badJson();
  return withRepo((repo) => updateCompetitor(repo, id, body.value));
}

export function DELETE(req: Request): Promise<Response> {
  const id = idOf(req);
  if (id === null) return Promise.resolve(missingId());
  return withRepo((repo) => deleteCompetitor(repo, id));
}
