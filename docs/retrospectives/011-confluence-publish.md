# Retrospective 011 — Publish comparison to Confluence (M8, FR-15)

## What shipped

A "Publish to Confluence" button that publishes the comparison as **one canonical
page** in space `SOFTWAREEN`, **created once and updated in place** on later runs.
Second Atlassian integration (ADR 008), built on the seam from feature-010.

- **Pure builder** `app/src/domain/confluence.ts`: `comparisonStorage(home,
  competitors)` → **storage-format XHTML** (intro + table + gaps list), `escapeXml`,
  the canonical title, and `confluencePublishResultSchema`.
- **I/O** `api/_lib/confluence.ts`: resolve `CONFLUENCE_SPACE_KEY` → space id →
  find page by title → **create** (`POST /wiki/api/v2/pages`) or **update** (`PUT`
  with `version.number + 1`). Body `representation: "storage"`.
- **Handler** `api/confluence.ts` (`POST /api/confluence`), client `publishConfluence`,
  and a second button in `IntegrationsBar` (now grouped Jira + Confluence props).

## Key decisions

- **Create-or-update by title = idempotent.** One page, refreshed — never
  duplicated. Confluence v2 needs a numeric `spaceId`, so the key is resolved at
  runtime (human-friendly env, one extra GET). Update reads the current version and
  PUTs `+1`.
- **Storage format, not the MCP's html/markdown/adf.** The app writes raw storage
  XHTML via REST; the body is plain `<table>`/`<ul>`/`<p>` (no `<ac:>` macros), so
  it's valid as both storage and html — which let the MCP live-verify it.
- **Verified against the real space up front** (like feature-010): read `SOFTWAREEN`
  and its pages via the MCP before coding; after, published a real page
  ([8421377](https://kanastasiiaclaude.atlassian.net/wiki/spaces/SOFTWAREEN/pages/8421377))
  and confirmed find-by-title resolves to it (so re-publish updates, not duplicates).

## What the multi-agent review drove (fixed before merge)

- **Correctness pass: clean** — no defects. Escaping covers all uncontrolled text
  (competitor/home names), XHTML valid, version bump + exact-title match correct,
  every non-OK → `AtlassianError`, `strictNullChecks` pattern already right.
- **DRY: the two integrations had ~parallel scaffolding.** Consolidated into the
  shared `api/_lib/atlassian.ts` created in this slice: `errorResponse`,
  `readAtlassianCreds` + `AtlassianCreds` (configs now `extends` it),
  `parseHomeAndCompetitors` (+ `BadRequestError`), `jsonAuthHeaders`, and `fetchJson`
  (the fetch→non-OK→`AtlassianError`→json helper, previously `readJson` in Confluence
  and inline in Jira). Both handlers dropped ~40 lines each; the next integration
  gets the seam for free.

## Verification

208 node specs green (storage XHTML + escaping + gaps, space resolve / find /
create-vs-update / version bump / error mapping with stubbed `fetch`, handler with
`vi.stubEnv`/`vi.stubGlobal`), lint + `app` build + `api` `tsc` clean. UI states in
the preview (both buttons + graceful `ApiError`). Live page created + find-by-title
confirmed via the MCP. The deployed app-path round-trip needs `ATLASSIAN_*` +
`CONFLUENCE_SPACE_KEY` on Vercel.

## Follow-ups

- M8 remaining: export (FR-13), Cron (FR-12).
- The shared `atlassian.ts` seam is ready if a future integration needs it.
