import { syncGapsToJira, type JiraConfig } from './_lib/jira';
import {
  AtlassianError,
  BadRequestError,
  errorResponse,
  parseHomeAndCompetitors,
  readAtlassianCreds,
} from './_lib/atlassian';

// Vercel Function — `POST /api/jira` (FR-14, ADR 008). Takes the current home +
// competitors, computes the gaps server-side, and files a Jira Task per gap
// (deduped by marker label). Thin handler over the shared Atlassian seam +
// `_lib/jira`; mirrors api/confluence.ts. Non-POST methods get a 405.

export async function POST(req: Request): Promise<Response> {
  let parsed: Awaited<ReturnType<typeof parseHomeAndCompetitors>>;
  try {
    parsed = await parseHomeAndCompetitors(req);
  } catch (cause) {
    if (cause instanceof BadRequestError) return errorResponse(cause.message, 400);
    throw cause;
  }

  const creds = readAtlassianCreds();
  if (!creds) return errorResponse('Atlassian is not configured', 500);
  const config: JiraConfig = { ...creds, projectKey: process.env.JIRA_PROJECT_KEY || 'KAN' };

  try {
    const result = await syncGapsToJira({ ...parsed, config });
    return Response.json(result, { status: 200 });
  } catch (cause) {
    if (cause instanceof AtlassianError) return errorResponse(cause.message, cause.status);
    return errorResponse('Jira sync failed', 502);
  }
}
