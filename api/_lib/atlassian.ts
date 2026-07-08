// Shared Atlassian Cloud REST seam (ADR 008), used by both the Jira (FR-14) and
// Confluence (FR-15) integrations: Basic auth, a typed error carrying the upstream
// status, a JSON-fetch helper, and the request-parsing/config scaffolding both
// thin handlers need. Web-standard only — no SDK.

import { parseCompetitor, type Competitor } from '../../app/src/domain/competitor';

/** An Atlassian REST failure carrying the upstream status (FR-16 surfacing). */
export class AtlassianError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AtlassianError';
    this.status = status;
  }
}

/** HTTP Basic auth header value: base64(email:token). */
export function basicAuth(email: string, apiToken: string): string {
  return `Basic ${btoa(`${email}:${apiToken}`)}`;
}

/** The auth + JSON headers every Atlassian REST call sends. */
export function jsonAuthHeaders(config: { email: string; apiToken: string }): Record<string, string> {
  return {
    authorization: basicAuth(config.email, config.apiToken),
    'content-type': 'application/json',
    accept: 'application/json',
  };
}

/**
 * `fetch` + JSON, mapping a non-OK response to an `AtlassianError` whose message
 * is `"<context> (status N)"`. The single place the REST error shape is decided.
 */
export async function fetchJson(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
  context: string,
): Promise<unknown> {
  const res = await fetchImpl(input, init);
  if (!res.ok) {
    throw new AtlassianError(`${context} (status ${res.status})`, res.status);
  }
  return res.json();
}

/** JSON `{ error }` response body — the shared handler error shape. */
export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** The Basic-auth credentials both integrations share (product-specific keys are added by the handler). */
export interface AtlassianCreds {
  baseUrl: string;
  email: string;
  apiToken: string;
}

/** Read the shared Atlassian credentials from env, or `null` if any is missing. */
export function readAtlassianCreds(): AtlassianCreds | null {
  const baseUrl = process.env.ATLASSIAN_BASE_URL;
  const email = process.env.ATLASSIAN_EMAIL;
  const apiToken = process.env.ATLASSIAN_API_TOKEN;
  if (!baseUrl || !email || !apiToken) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ''), email, apiToken };
}

/** A malformed request body — the handler maps it to `400`. */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/**
 * Parse + validate the `{ home, competitors }` body both integration handlers
 * accept. Throws `BadRequestError` (→ 400) on malformed JSON or an invalid
 * competitor; the ids/shape are enforced by `competitorSchema` via `parseCompetitor`.
 */
export async function parseHomeAndCompetitors(
  req: Request,
): Promise<{ home: Competitor; competitors: Competitor[] }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestError('Request body must be valid JSON');
  }

  const raw = body as { home?: unknown; competitors?: unknown } | null;
  try {
    const home = parseCompetitor(raw?.home);
    const competitorsRaw = raw?.competitors;
    if (!Array.isArray(competitorsRaw)) {
      throw new Error('"competitors" must be an array');
    }
    return { home, competitors: competitorsRaw.map((c) => parseCompetitor(c)) };
  } catch (cause) {
    throw new BadRequestError(`Invalid request body: ${(cause as Error).message}`);
  }
}
