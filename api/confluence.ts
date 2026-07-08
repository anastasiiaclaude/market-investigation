import { publishComparison, type ConfluenceConfig } from './_lib/confluence';
import {
  AtlassianError,
  BadRequestError,
  errorResponse,
  parseHomeAndCompetitors,
  readAtlassianCreds,
} from './_lib/atlassian';

// Vercel Function — `POST /api/confluence` (FR-15, ADR 008). Takes the current
// home + competitors and publishes them as the canonical comparison page
// (create-or-update by title). Thin handler over the shared Atlassian seam +
// `_lib/confluence`; mirrors api/jira.ts. Non-POST methods get a 405.

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
  const config: ConfluenceConfig = {
    ...creds,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY || 'SOFTWAREEN',
  };

  try {
    const result = await publishComparison({ ...parsed, config });
    return Response.json(result, { status: 200 });
  } catch (cause) {
    if (cause instanceof AtlassianError) return errorResponse(cause.message, cause.status);
    return errorResponse('Confluence publish failed', 502);
  }
}
