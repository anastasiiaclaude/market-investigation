import { buildHealthResponse, HEALTH_OK_STATUS } from './_lib/health.js';

// Vercel Function — `GET /api/health`. Web-standard signature, so no extra
// runtime dependency is needed for the M1 skeleton (see ADR 003).
export function GET(): Response {
  return Response.json(buildHealthResponse(), { status: HEALTH_OK_STATUS });
}
