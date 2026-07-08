# Feature 011 — Publish the comparison to Confluence (M8)

Milestone **M8**, third slice. A "Publish to Confluence" button publishes the
competitor comparison as a **single canonical page** in space `SOFTWAREEN`,
**created once and updated in place** on later runs. Traces to **FR-15** (publish
the comparison to Confluence). Decision:
[ADR 008](../decisions/008-atlassian-integration.md); shares the Atlassian seam
built for Jira (feature-010).
[issue #8](https://github.com/anastasiiaclaude/market-investigation/issues/8).

No new runtime dependency (REST via `fetch`) → covered by ADR 008.

## User story

As the product manager, I want to publish the current comparison to a Confluence
page my team can read — and re-publish to refresh it — without creating a new page
every time.

## Design decisions (confirmed)

- **Pure page builder, thin I/O** (mirrors Jira). `app/src/domain/confluence.ts`
  (node-tested) builds the **storage-format XHTML** body from `home` + competitors:
  an intro paragraph, the comparison **table** (rows = the 6 feature areas, columns
  = VA-INDIGO + each competitor, rating as text, VA-INDIGO gap cells flagged), and a
  **"Gaps" bullet list**. Reuses `buildComparison`/`gapAreas`/`strongerCompetitors`
  from `gap.ts`. Also owns the canonical title + the response schema.
- **Shared Atlassian seam.** `basicAuth` + `AtlassianError` move from
  `api/_lib/jira.ts` into a new `api/_lib/atlassian.ts`, imported by both Jira and
  Confluence (DRY — the same Basic-auth + typed error).
- **Create-or-update by title (idempotent).** REST v2: resolve `CONFLUENCE_SPACE_KEY`
  → space id, find a page with the canonical title in that space; if absent
  **create** (`POST /wiki/api/v2/pages`), else **update** it (`PUT
  /wiki/api/v2/pages/{id}` with `version.number + 1`). One page, refreshed — never
  duplicated. Body `representation: "storage"`.
- **Canonical title:** `VA-INDIGO — Competitive comparison` (the dedup/update key).
- **Frontend triggers, server holds the token.** A "Publish to Confluence" button in
  `IntegrationsBar` POSTs `{ home, competitors }` to `POST /api/confluence`; the
  function builds the page server-side and returns `{ pageId, url, action }`
  (`action` = `created` | `updated`). Reuses the FR-16 `send`/`apiError` client seam.
- **Config + errors.** `ATLASSIAN_BASE_URL` / `ATLASSIAN_EMAIL` /
  `ATLASSIAN_API_TOKEN` / `CONFLUENCE_SPACE_KEY` (default `SOFTWAREEN`); missing →
  `500` "Atlassian is not configured". Upstream failures → `AtlassianError(status)`
  forwarded; the client maps 429 → friendly retryable message.

## API contract

`POST /api/confluence`
- Body: `{ home: Competitor, competitors: Competitor[] }` (validated via
  `competitorSchema`).
- `200`: `{ pageId: string, url: string, action: "created" | "updated" }`.
- `400` invalid body · `500` not configured · upstream status forwarded.

## Acceptance criteria

- GIVEN a home + competitors
  WHEN `comparisonStorage` runs
  THEN it returns storage XHTML containing one table header cell per competitor
  plus VA-INDIGO, one row per feature area with the rating text, gap cells flagged,
  and a gaps list naming the gap areas; all interpolated text is XML-escaped.
- GIVEN no page with the canonical title exists
  WHEN the handler publishes
  THEN it POSTs a new page and returns `action: "created"`.
- GIVEN the page already exists at version N
  WHEN the handler publishes
  THEN it PUTs the same page id with `version.number = N + 1` and returns
  `action: "updated"` (no second page).
- GIVEN a `429` from Confluence
  WHEN the client runs
  THEN it throws a retryable `ApiError` (FR-16) and the button shows the friendly
  message.

## Verification

Node-only specs (no jsdom): `app/src/domain/confluence.spec.ts` (storage XHTML +
escaping + gaps) and `api/_lib/confluence.spec.ts` (space resolve, find-by-title,
create vs update version bump, error mapping — stubbed `fetch`), plus a handler
spec mirroring `api/jira.spec.ts`.

The live round-trip is **deploy-verified** (Atlassian env vars on Vercel) and
confirmed in-session via the Atlassian MCP: publish, then `getPagesInConfluenceSpace`
/`getConfluencePage` show the page in `SOFTWAREEN`; a second publish updates it (one
page, version incremented). A consented pre-deploy sample validates the storage body.

## Out of scope

- Attachments/images, labels on the page, comments, per-competitor sub-pages.
- Configurable title/parent via UI (env + constant).
- Rendering the Jira issue links into the page (possible follow-up).

## Open questions

- None.
