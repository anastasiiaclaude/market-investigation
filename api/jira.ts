import { syncGapsToJira, AtlassianError, type JiraConfig } from './_lib/jira';
import { parseCompetitor, type Competitor } from '../app/src/domain/competitor';

// Vercel Function — `POST /api/jira` (FR-14, ADR 008). Takes the current home +
// competitors, computes the gaps server-side (same `gap.ts`), and files a Jira
// Task per gap (deduped by marker label). Web-standard handler, mirroring
// api/research.ts. Methods other than POST get a framework-provided 405.

function error(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Assemble the Jira config from env, or `null` if a required var is missing. */
function readConfig(): JiraConfig | null {
  const baseUrl = process.env.ATLASSIAN_BASE_URL;
  const email = process.env.ATLASSIAN_EMAIL;
  const apiToken = process.env.ATLASSIAN_API_TOKEN;
  if (!baseUrl || !email || !apiToken) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''), // tolerate a trailing slash
    email,
    apiToken,
    projectKey: process.env.JIRA_PROJECT_KEY || 'KAN',
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
    if (!Array.isArray(raw?.competitors)) {
      throw new Error('"competitors" must be an array');
    }
    competitors = raw.competitors.map((c) => parseCompetitor(c));
  } catch (cause) {
    return error(`Invalid request body: ${(cause as Error).message}`, 400);
  }

  const config = readConfig();
  if (!config) {
    return error('Atlassian is not configured', 500);
  }

  try {
    const result = await syncGapsToJira({ home, competitors, config });
    return Response.json(result, { status: 200 });
  } catch (cause) {
    if (cause instanceof AtlassianError) {
      return error(cause.message, cause.status);
    }
    return error('Jira sync failed', 502);
  }
}
