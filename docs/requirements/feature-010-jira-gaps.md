# Feature 010 — Create Jira issues from gaps (M8)

Milestone **M8**, second slice. A button turns the identified competitive gaps
into **Jira issues** in project `KAN`, one per gap, deduped so re-runs don't
spam. Traces to **FR-14** (create Jira issues from identified gaps). Depends on
M3's gap logic (`domain/gap.ts`) and the FR-16 `ApiError` plumbing. Decision:
[ADR 008](../decisions/008-atlassian-integration.md).
[issue #8](https://github.com/anastasiiaclaude/market-investigation/issues/8).

No new runtime dependency (REST via `fetch`) → covered by ADR 008.

## User story

As the product manager, after I see where VA-INDIGO is weak or absent versus
competitors, I want to push those gaps into Jira as tasks with one click — so the
team has actionable backlog items — without creating a duplicate every time I run it.

## What is a "gap"

Unchanged from FR-4 (`domain/gap.ts`): a **VA-INDIGO feature area** rated weak or
absent where **at least one competitor rates strictly higher**. Gaps are therefore
per feature area (≤ 6), not per competitor. One Jira issue per gap area.

## Design decisions (confirmed)

- **Pure mapping, thin I/O** (as everywhere). `app/src/domain/jira.ts` (node-tested,
  keeps the all-Zod-in-`app/src` invariant) turns a `home` + `competitors` into
  `JiraIssueSpec[]` — one per gap area — each carrying `summary`, an **ADF**
  `description` (built by a small pure `adfDoc` helper), and `labels`. The HTTP
  orchestration + a typed `AtlassianError` live in `api/_lib/jira.ts`; the handler
  is `api/jira.ts`.
- **Issue shape.** Type **Task** in `KAN`. Summary `Close competitive gap: <area
  label>`. Description lists VA-INDIGO's rating and the stronger competitors
  (name + rating). Labels `["market-investigation", "mi-gap-<area>"]`. `reporter`
  defaults to the authenticated token user (not sent); only `project`, `issuetype`,
  `summary` are required by `KAN` (verified via createmeta).
- **Dedup by marker label (idempotent).** Before creating a gap's issue the handler
  JQL-searches `project = <key> AND labels = "mi-gap-<area>"`; if one exists it is
  **skipped**. So re-running only creates issues for newly-appeared gaps. (Resolved
  issues still count as existing — dedup is by presence, not status; refinement is
  out of scope.)
- **Frontend triggers, server holds the token.** A "Push gaps to Jira" button POSTs
  `{ home, competitors }` to `POST /api/jira`; the function computes gaps
  server-side (same `gap.ts`), dedups, creates, and returns
  `{ created: [{area, key}], skipped: [{area}] }`. The token never reaches the
  browser. `home` (VA-INDIGO) is client-pinned, so it is sent in the body rather
  than read from the DB.
- **Config + errors.** Reads `ATLASSIAN_BASE_URL` / `ATLASSIAN_EMAIL` /
  `ATLASSIAN_API_TOKEN` / `JIRA_PROJECT_KEY` (default `KAN`) from env; missing →
  `500` "Atlassian is not configured". Upstream failures become an
  `AtlassianError(status)` → the handler forwards the status; the client reuses the
  FR-16 `apiError` mapping (429 → friendly, retryable), so the button surfaces a
  graceful message.

## API contract

`POST /api/jira`
- Body: `{ home: Competitor, competitors: Competitor[] }` (validated via
  `competitorSchema`).
- `200`: `{ created: { area, key }[], skipped: { area }[] }`.
- `400` invalid body · `500` not configured · upstream status (e.g. `429`) forwarded.

## Acceptance criteria

- GIVEN a home + competitors with two gap areas
  WHEN `gapIssueSpecs` runs
  THEN it returns exactly two specs, each with a `mi-gap-<area>` marker label, the
  `market-investigation` label, a non-empty summary naming the area, and an ADF
  description naming the stronger competitor(s).
- GIVEN a home area that is weak but no competitor is stronger
  WHEN `gapIssueSpecs` runs
  THEN no spec is produced for it (matches `isGap`).
- GIVEN a gap whose marker label already exists in Jira
  WHEN the handler syncs
  THEN that issue is reported under `skipped`, not `created` (no duplicate POST).
- GIVEN `createIssue` receives a valid spec
  WHEN it POSTs to `/rest/api/3/issue`
  THEN the body is `{ fields: { project, issuetype: { name: "Task" }, summary,
  description(ADF), labels } }` and it returns the new issue `key`.
- GIVEN a `429` from Jira
  WHEN the client runs
  THEN it throws a retryable `ApiError` (FR-16), and the button shows the friendly
  rate-limit message.

## Verification

Node-only specs (no jsdom): `app/src/domain/jira.spec.ts` (gap→spec mapping + ADF)
and `api/_lib/jira.spec.ts` (auth header, dedup search, create payload, sync
orchestration, error mapping — all with a stubbed `fetch`).

The live round-trip is **deploy-verified** (vite dev doesn't serve `api/`; needs the
Atlassian env vars on Vercel) **and** confirmed in-session via the connected
Atlassian MCP: after a run, `searchJiraIssuesUsingJql`/`getJiraIssue` show the
`KAN` issues with the right labels; a second run skips them. Before deploy, the ADF
+ payload shape can be validated by creating one real sample issue through the MCP
(with consent) to confirm `KAN` accepts it.

## Out of scope

- Confluence publish (FR-15, feature-011).
- Per-competitor issues, sub-tasks, epics, assignees, priorities.
- Re-opening / updating existing issues (dedup only skips), closing stale ones.
- A settings UI for project/labels (env-configured).

## Open questions

- None.
