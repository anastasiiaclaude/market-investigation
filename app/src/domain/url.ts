/**
 * Shared URL validation. Both the add/edit form (M7) and the research input (M8)
 * gate on a valid `http(s)` URL before doing anything with it, so the check lives
 * in one pure place. Mirrors the backend's `isValidHttpUrl` guard in
 * `api/research.ts`.
 */
export function isHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
