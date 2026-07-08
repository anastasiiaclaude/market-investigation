import { publishComparison, type ConfluenceConfig } from './_lib/confluence';
import { AtlassianError } from './_lib/atlassian';
import { parseCompetitor, type Competitor } from '../app/src/domain/competitor';

// Vercel Function — `POST /api/confluence` (FR-15, ADR 008). Takes the current
// home + competitors and publishes them as the canonical comparison page
// (create-or-update by title). Web-standard handler, mirroring api/jira.ts.

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Assemble the Confluence config from env, or `null` if a required var is missing. */
function readConfig(): ConfluenceConfig | null {
  const baseUrl = process.env.ATLASSIAN_BASE_URL;
  const email = process.env.ATLASSIAN_EMAIL;
  const apiToken = process.env.ATLASSIAN_API_TOKEN;
  if (!baseUrl || !email || !apiToken) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    email,
    apiToken,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY || 'SOFTWAREEN',
  };
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('Request body must be valid JSON', 400);
  }

  const raw = body as { home?: unknown; competitors?: unknown } | null;
  let home: Competitor;
  let competitors: Competitor[];
  try {
    home = parseCompetitor(raw?.home);
    const competitorsRaw = raw?.competitors;
    if (!Array.isArray(competitorsRaw)) {
      throw new Error('"competitors" must be an array');
    }
    competitors = competitorsRaw.map((c) => parseCompetitor(c));
  } catch (cause) {
    return error(`Invalid request body: ${(cause as Error).message}`, 400);
  }

  const config = readConfig();
  if (!config) {
    return error('Atlassian is not configured', 500);
  }

  try {
    const result = await publishComparison({ home, competitors, config });
    return Response.json(result, { status: 200 });
  } catch (cause) {
    if (cause instanceof AtlassianError) {
      return error(cause.message, cause.status);
    }
    return error('Confluence publish failed', 502);
  }
}
