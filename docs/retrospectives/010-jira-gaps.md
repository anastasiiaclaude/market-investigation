# Retrospective 010 — Jira issues from gaps (M8, FR-14)

## What shipped

A "Push gaps to Jira" button that files one Jira **Task** per competitive gap into
project `KAN`, deduped so re-runs don't spam. First outbound integration (ADR 008).

- **Pure mapping** `app/src/domain/jira.ts`: `gapIssueSpecs(home, competitors)` →
  one spec per gap area (summary, ADF description, labels, marker label), plus a
  minimal ADF builder (`adfDoc`/`adfParagraph`/`adfBulletList`) since Jira REST v3
  requires the description as an ADF document, not a string.
- **I/O** `api/_lib/jira.ts`: Basic-auth (`btoa(email:token)`), dedup search
  (`POST /rest/api/3/search/jql` by marker label), `createIssue`
  (`POST /rest/api/3/issue`), and `syncGapsToJira` orchestration. Typed
  `AtlassianError(status)`.
- **Handler** `api/jira.ts` (`POST /api/jira`): validates `{ home, competitors }`,
  reads env config, computes gaps server-side, returns `{ created, skipped }`.
- **Frontend**: `syncJiraGaps` client (reuses the FR-16 `send`/`apiError` seam) +
  `IntegrationsBar` component; `App` owns the async state.

## Key decisions

- **Gaps are per feature-area** (≤6), so ≤6 issues; dedup marker `mi-gap-<area>`.
  Idempotent by design — a mid-run failure leaves already-created issues, and the
  next run skips them (no `?` state to reconcile).
- **REST via `fetch`, no SDK** (mirrors OpenRouter); one Atlassian credential pair
  serves Jira + Confluence. `reporter` defaults to the token user (createmeta
  showed only `project`/`issuetype`/`summary` are required in `KAN`).
- **Verified against the real instance up front** via the connected Atlassian MCP:
  read `KAN`'s project id, issue types, and required fields before writing a line —
  so the payload shape was known-correct, not guessed.

## What the multi-agent review caught (all fixed before merge)

- **`strictNullChecks` latent error**: `raw.competitors` after
  `Array.isArray(raw?.competitors)` doesn't narrow `raw` from `{…}|null`. Slipped
  past the root build because **`npm run build` does not typecheck `api/`** (only
  `app/`). Fixed by binding `raw?.competitors` first. *Lesson: run
  `tsc -p api` in review — the root build won't catch api type errors.*
- **Duplicated `JiraSyncResult` + uncast response**: the client cast the reply
  instead of validating it like every sibling client. Unified into one
  `jiraSyncResultSchema` in `app/src/domain/jira.ts` (keeps the all-Zod-in-`app/src`
  invariant), imported by the backend type + parsed by the client.
- **Business logic in a component**: `summarize` lived in `IntegrationsBar` → moved
  to `summarizeJiraSync` in `domain/jira.ts` with tests.
- **DRY**: extracted `strongerCompetitors` + `gapAreas` into `gap.ts`, reused by
  `isGap`, the Jira mapping, and the button's gap count (was building full
  `gapIssueSpecs` just to read `.length`).

## Verification

184 node specs green (pure mapping + ADF, auth/dedup/create/sync with stubbed
`fetch`, handler with `vi.stubEnv`/`vi.stubGlobal`), lint + `app` build + `api`
`tsc` all clean. UI states exercised against the preview mock (button + graceful
`ApiError`). Live create round-trip is deploy-verified (Atlassian env vars on
Vercel) and confirmable in-session via the MCP.

## Follow-ups

- Live MCP confirmation of a real `KAN` issue is a one-shot check once deployed
  (or a consented pre-deploy sample).
- Next M8 slice: Confluence publish (FR-15, feature-011) — shares this Atlassian seam.
