# ADR 008 — Atlassian integration (Jira issues + Confluence publish)

## Context

M8 needs two outbound integrations (FR-14, FR-15): create **Jira** issues from the
identified competitive gaps, and publish the comparison to **Confluence**. Like the
LLM (ADR 004), these run at **runtime in the deployed app**, not via the Claude
agent — a serverless function must call Atlassian itself.

The target is a real Atlassian Cloud site (`kanastasiiaclaude.atlassian.net`): Jira
project **`KAN`** ("Market Research", team-managed) and Confluence space
**`SOFTWAREEN`**. Both REST APIs are on the same host, same auth.

## Decision

Call the **Atlassian Cloud REST API directly with `fetch`** from serverless
functions — no SDK, mirroring the OpenRouter approach.

- **Where:** only inside `api/` functions (`POST /api/jira`, `POST /api/confluence`).
  The frontend triggers them but never calls Atlassian directly (the token is
  server-only).
- **Auth:** HTTP Basic — `Authorization: Basic base64(email:api_token)`. An
  Atlassian API token (id.atlassian.com → API tokens) + the account email. Stored
  in Vercel env / local `.env` (gitignored), documented in `.env.example`:
  `ATLASSIAN_BASE_URL` (e.g. `https://kanastasiiaclaude.atlassian.net`),
  `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, plus `JIRA_PROJECT_KEY` (default `KAN`)
  and `CONFLUENCE_SPACE_KEY` (default `SOFTWAREEN`). One credential pair serves
  both products (same site). (Supersedes the earlier `JIRA_*`/`CONFLUENCE_*`
  placeholders in `.env.example`.)
- **APIs:** Jira REST **v3** (`/rest/api/3/issue`, `/rest/api/3/search/jql`) —
  descriptions are **ADF** (Atlassian Document Format) JSON, built by a small pure
  helper. Confluence REST v2 (`/wiki/api/v2/pages`) — body in `storage` format.
- **Pure vs I/O split** (as everywhere): the gap→issue and comparison→page
  transforms are pure, node-tested modules in `app/src/domain/` (keeping the
  all-Zod-in-`app/src` invariant); the HTTP orchestration + a typed
  `AtlassianError` (carrying the upstream status, reused by the FR-16 `ApiError`
  path) live in `api/_lib/`.
- **Idempotency:** re-running must not duplicate. **Jira** — each gap issue carries
  a deterministic marker label (`market-investigation` + `mi-gap-<area>`); the
  handler JQL-searches for the marker and skips issues that already exist.
  **Confluence** — one canonical page, matched by title in the space and
  **updated** in place (create-or-update), not re-created.

## Consequences

- New external dependency: an Atlassian Cloud site + API token. Covered by this ADR
  (no separate dependency ADR — it is a REST call, no npm package).
- Verifiable end to end: unit tests cover the pure transforms with a stubbed
  `fetch`; the live round-trip is deploy-verified on Vercel, and can be confirmed
  in-session via the connected Atlassian MCP (read the created issues / page).
- Blast radius is the user's real Jira/Confluence — the marker-label dedup (Jira)
  and title-match update (Confluence) keep re-runs from spamming.
- No change to deploy target (Vercel) or DB (Neon); adds two outbound calls only.
- Split across two features/specs: **feature-010** (Jira, FR-14) then **feature-011**
  (Confluence, FR-15).
