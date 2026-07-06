/**
 * URL-based competitor identity (M6, ADR 007). `websiteKey` collapses the many
 * URL spellings of one competitor site into a single stable key, used as the DB
 * primary key, the research dedup key, and the REST resource id. Pure and
 * zod-free so both the frontend and (transitively) the `api/` backend share one
 * normalization.
 */

/** Query params that carry no identity — pure tracking/analytics noise. */
const TRACKING_PARAMS = /^(utm_|mc_)|^(gclid|fbclid|ref|ref_src)$/;

/**
 * Normalize an http(s) URL into its competitor key: lowercase host (without a
 * leading `www.`), non-default port preserved, path without a trailing slash,
 * meaningful query params sorted (tracking params dropped), scheme and hash
 * discarded. Throws if `raw` is not a parseable URL.
 */
export function websiteKey(raw: string): string {
  const url = new URL(raw); // throws on an unparseable URL — callers pass validated input

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const port = url.port ? `:${url.port}` : ''; // URL already drops the scheme's default port

  const path = url.pathname.replace(/\/+$/, ''); // strip trailing slash(es); '/' → ''

  const params = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length > 0 ? `?${params.map(([k, v]) => `${k}=${v}`).join('&')}` : '';

  return `${host}${port}${path}${query}`;
}
