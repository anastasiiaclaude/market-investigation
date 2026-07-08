// Confluence REST orchestration (M8, FR-15 — ADR 008). Publishes the comparison
// as one canonical page (create-or-update by title), so re-runs refresh it rather
// than duplicating. Web-standard `fetch` + Basic auth (shared `_lib/atlassian`).
// The pure page builder lives in app/src/domain/confluence.ts.

import {
  comparisonPage,
  type ConfluencePublishResult,
} from '../../app/src/domain/confluence';
import type { Competitor } from '../../app/src/domain/competitor';
import { AtlassianError, fetchJson, jsonAuthHeaders, type AtlassianCreds } from './atlassian';

export interface ConfluenceConfig extends AtlassianCreds {
  spaceKey: string;
}

interface PageLinks {
  _links?: { webui?: string; base?: string };
}

/** Absolute page URL from a v2 response's `_links`. */
function pageUrl(config: ConfluenceConfig, data: PageLinks): string {
  const webui = data._links?.webui;
  if (!webui) return config.baseUrl;
  const base = data._links?.base ?? `${config.baseUrl}/wiki`;
  return `${base}${webui}`;
}

/** Resolve the configured space key to its numeric id (v2 needs the id). */
export async function resolveSpaceId(
  config: ConfluenceConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const url = `${config.baseUrl}/wiki/api/v2/spaces?keys=${encodeURIComponent(config.spaceKey)}`;
  const data = (await fetchJson(
    fetchImpl,
    url,
    { headers: jsonAuthHeaders(config) },
    'Confluence space lookup failed',
  )) as { results?: Array<{ id?: string }> };
  const id = data.results?.[0]?.id;
  if (!id) {
    throw new AtlassianError(`Confluence space "${config.spaceKey}" not found`, 404);
  }
  return id;
}

/** Find a page by exact title in the space; return its id, or null. */
export async function findPageIdByTitle(
  spaceId: string,
  title: string,
  config: ConfluenceConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const url =
    `${config.baseUrl}/wiki/api/v2/pages?space-id=${encodeURIComponent(spaceId)}` +
    `&title=${encodeURIComponent(title)}`;
  const data = (await fetchJson(
    fetchImpl,
    url,
    { headers: jsonAuthHeaders(config) },
    'Confluence page search failed',
  )) as { results?: Array<{ id?: string; title?: string }> };
  return data.results?.find((p) => p.title === title)?.id ?? null;
}

/** Current version number of a page (needed to bump on update). */
async function currentVersion(
  pageId: string,
  config: ConfluenceConfig,
  fetchImpl: typeof fetch,
): Promise<number> {
  const data = (await fetchJson(
    fetchImpl,
    `${config.baseUrl}/wiki/api/v2/pages/${pageId}`,
    { headers: jsonAuthHeaders(config) },
    'Confluence page fetch failed',
  )) as { version?: { number?: number } };
  return data.version?.number ?? 1;
}

export async function createPage(
  spaceId: string,
  title: string,
  storage: string,
  config: ConfluenceConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; url: string }> {
  const data = (await fetchJson(
    fetchImpl,
    `${config.baseUrl}/wiki/api/v2/pages`,
    {
      method: 'POST',
      headers: jsonAuthHeaders(config),
      body: JSON.stringify({
        spaceId,
        status: 'current',
        title,
        body: { representation: 'storage', value: storage },
      }),
    },
    'Confluence page create failed',
  )) as { id?: string } & PageLinks;
  if (!data.id) throw new AtlassianError('Confluence create returned no page id', 502);
  return { id: data.id, url: pageUrl(config, data) };
}

export async function updatePage(
  pageId: string,
  title: string,
  storage: string,
  config: ConfluenceConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; url: string }> {
  const nextVersion = (await currentVersion(pageId, config, fetchImpl)) + 1;
  const data = (await fetchJson(
    fetchImpl,
    `${config.baseUrl}/wiki/api/v2/pages/${pageId}`,
    {
      method: 'PUT',
      headers: jsonAuthHeaders(config),
      body: JSON.stringify({
        id: pageId,
        status: 'current',
        title,
        body: { representation: 'storage', value: storage },
        version: { number: nextVersion },
      }),
    },
    'Confluence page update failed',
  )) as { id?: string } & PageLinks;
  if (!data.id) throw new AtlassianError('Confluence update returned no page id', 502);
  return { id: data.id, url: pageUrl(config, data) };
}

/**
 * Publish the comparison as the canonical page: create it the first time, update
 * it in place after (idempotent — always exactly one page).
 */
export async function publishComparison(opts: {
  home: Competitor;
  competitors: Competitor[];
  config: ConfluenceConfig;
  fetchImpl?: typeof fetch;
}): Promise<ConfluencePublishResult> {
  const { home, competitors, config, fetchImpl = fetch } = opts;
  const { title, storage } = comparisonPage(home, competitors);

  const spaceId = await resolveSpaceId(config, fetchImpl);
  const existingId = await findPageIdByTitle(spaceId, title, config, fetchImpl);

  if (existingId) {
    const { id, url } = await updatePage(existingId, title, storage, config, fetchImpl);
    return { pageId: id, url, action: 'updated' };
  }
  const { id, url } = await createPage(spaceId, title, storage, config, fetchImpl);
  return { pageId: id, url, action: 'created' };
}
