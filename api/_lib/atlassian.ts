// Shared Atlassian Cloud REST seam (ADR 008), used by both the Jira (FR-14) and
// Confluence (FR-15) integrations: HTTP Basic auth + a typed error carrying the
// upstream status. Web-standard only — no SDK.

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
