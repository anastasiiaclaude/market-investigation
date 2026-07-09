import { refreshAllCompetitors } from './_lib/cron.js';
import { DEFAULT_MODEL } from './_lib/openrouter.js';
import { getRepo, DbNotConfiguredError } from './_lib/db/client.js';

// Vercel Function — `GET /api/cron` (FR-12). Invoked daily by Vercel Cron, which
// sends `Authorization: Bearer <CRON_SECRET>`. Re-researches every saved competitor
// and refreshes the DB. Thin over api/_lib/cron; mirrors api/research.ts.

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function GET(req: Request): Promise<Response> {
  // Auth first — reject before touching OpenRouter or the DB.
  const secret = process.env.CRON_SECRET;
  if (!secret) return error('CRON_SECRET is not configured', 500);
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return error('Unauthorized', 401);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return error('OPENROUTER_API_KEY is not configured', 500);
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  let repo;
  try {
    repo = getRepo();
  } catch (cause) {
    if (cause instanceof DbNotConfiguredError) return error(cause.message, 500);
    throw cause;
  }

  const result = await refreshAllCompetitors({ repo, apiKey, model });
  return Response.json(result, { status: 200 });
}
