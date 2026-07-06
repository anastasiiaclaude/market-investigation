import { runResearch, ResearchError } from './_lib/research';
import { DEFAULT_MODEL } from './_lib/openrouter';
import { assertPublicUrl, BlockedUrlError } from './_lib/url-guard';
import { getRepo, DbNotConfiguredError } from './_lib/db/client';

// Vercel Function — `POST /api/research`. Web-standard signature (no runtime
// dependency), mirroring api/health.ts. Fetches + extracts a competitor page and
// summarizes it via OpenRouter (ADR 004 + ADR 005), returning a Competitor.
// Methods other than POST get a framework-provided 405.

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('Request body must be valid JSON', 400);
  }

  const url = (body as { url?: unknown } | null)?.url;
  if (!isValidHttpUrl(url)) {
    return error('Body must include a valid http(s) "url"', 400);
  }

  // SSRF guard (issue #15): reject internal/private hosts before any fetch.
  try {
    assertPublicUrl(url);
  } catch (cause) {
    if (cause instanceof BlockedUrlError) {
      return error(cause.message, 400);
    }
    throw cause;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return error('OPENROUTER_API_KEY is not configured', 500);
  }
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  // Persistence is part of the M6 contract — the researched competitor is upserted
  // (dedup by URL id) before it is returned.
  let repo;
  try {
    repo = getRepo();
  } catch (cause) {
    if (cause instanceof DbNotConfiguredError) {
      return error(cause.message, 500);
    }
    throw cause;
  }

  try {
    const competitor = await runResearch({ url, apiKey, model, repo });
    return Response.json(competitor, { status: 200 });
  } catch (cause) {
    if (cause instanceof ResearchError) {
      return error(cause.message, cause.status);
    }
    return error('Research failed', 502);
  }
}
