# Feature 009 — Robustness: graceful loading/error, invalid URL, rate limits (M8)

Milestone **M8**, first slice. Makes the app's data-fetching surfaces resilient
and honest: friendly error messages instead of raw status strings, a real error
state (with retry) distinct from the dev "sample data" fallback, and a first
**research entry point** in the UI so that invalid-URL and rate-limit handling
have a place to live. Traces to **FR-16** (handle loading/error states, invalid
URLs, and rate limits gracefully). Depends on M5 (research endpoint), M6
(persistence + read path), M7 (write path) — all done.
[issue #8](https://github.com/anastasiiaclaude/market-investigation/issues/8).

No new runtime dependency → no ADR.

## Why a research UI is in scope

FR-16 names **invalid URL** and **rate limits**. Both only occur in the research
pipeline (`POST /api/research`): the user supplies a competitor URL that is
fetched, and OpenRouter can throttle with `429`. That endpoint has existed since
M5 and persists since M6, but **nothing in `app/src` calls it** — the app even
tells the user "add one via research" with no such control. A minimal research
input is therefore the natural home for two-thirds of FR-16, and it closes a real
product gap (the missing frontend for FR-8/FR-9). It is deliberately minimal: one
URL field + a button, reusing the existing `upsert` to add the researched record.

## User story

As the product manager, I want the dashboard to tell me clearly what went wrong —
a bad URL, a busy AI service, or a server that's down — and let me retry, instead
of silently showing sample data or a cryptic "failed with status 500".

## Design decisions (confirmed)

- **Friendly errors are pure and shared.** A new pure `app/src/domain/api-error.ts`
  turns a failed `Response` into a typed `ApiError { message, status, retryable }`.
  It reads the API's `{ error }` JSON body (the backend already writes real
  sentences), special-cases `429` into a wait-and-retry message, marks
  `429`/`5xx` as `retryable`, and degrades safely when the body isn't JSON. Both
  the read/write clients and the research client throw it, so every surface speaks
  the same language. A network throw (no `Response`) becomes an `ApiError` with
  `status 0` and a "couldn't reach the server" message.
- **Rate limits surface as `429`, end to end.** Today an OpenRouter `429` is
  wrapped into a generic `502`. `callOpenRouter` now throws a typed
  `OpenRouterError` carrying the upstream status; `runResearch` maps a `429` to a
  `ResearchError` with status **429** and a rate-limit message (other upstream
  failures stay `502`). The handler already forwards `ResearchError.status`, so
  the client's `429` branch can trigger. Backend stays dependency-free + node-tested.
- **Dev fallback vs real error are distinct.** `fetchCompetitors` throws an
  `ApiError` for a non-OK **status** (a real server error) and a plain error for a
  parse/shape failure (the vite-dev signature: `/api` returns `index.html`, so
  JSON parsing throws). `useCompetitors` classifies by type: an `ApiError` → an
  **error** state with a **Retry**; anything else → the existing mock **fallback**
  + "sample data" banner. So `npm run dev` still renders, but a deployed `500` no
  longer masquerades as sample data.
- **Shared URL check.** `isHttpUrl` moves to a pure `app/src/domain/url.ts` and is
  reused by both the research input and the existing form (removing the form's
  private copy — a DRY move, not a scope creep). Invalid URLs are rejected client-
  side before any request.
- **Minimal research UI, App-orchestrated.** A `ResearchBar` component (URL input
  + button) renders above the toolbar. App owns the async state (`idle` / busy /
  error) exactly like the M7 form's submit handler, calls `researchCompetitor`,
  and `upsert`s the returned record on success. No new dependency, no router.

## Scope

**In:** `api-error.ts`, `url.ts`, `researchCompetitor` client + `ApiError`-throwing
read/write clients, backend `429` surfacing, `useCompetitors` error/retry state,
`ResearchBar`, App wiring, styles.

**Out:** batching/queuing research, automatic retry/back-off (the user retries),
persisting research history, and the other M8 slices (export FR-13, Jira FR-14,
Confluence FR-15, Cron FR-12).

## Acceptance criteria

- GIVEN a `Response` with status `429`
  WHEN `apiError(res)` runs
  THEN it returns `{ status: 429, retryable: true }` and a message that mentions
  the service being busy / to try again — not the raw body.
- GIVEN a non-OK `Response` carrying `{ error: "…" }`
  WHEN `apiError(res)` runs (status ≠ 429)
  THEN the message is that server sentence (not `status N`), and `retryable` is
  true only for `5xx`.
- GIVEN a `Response` whose body is not JSON (e.g. HTML)
  WHEN `apiError(res)` runs
  THEN it still returns a usable message (falls back to status text) and does not
  throw.
- GIVEN `callOpenRouter` receives an upstream `429`
  WHEN `runResearch` handles it
  THEN it throws a `ResearchError` with `status === 429` (a non-`429` upstream
  failure stays `502`).
- GIVEN `fetchCompetitors` sees a non-OK status
  WHEN it throws
  THEN the thrown value is an `ApiError`; a parse/shape failure throws a
  non-`ApiError` (so the hook can tell a server error from the dev fallback).
- GIVEN a valid `http(s)` URL
  WHEN `researchCompetitor` POSTs it and the API returns `200` a `Competitor`
  THEN the client returns the validated record (merged via `upsert`); a non-OK
  status throws an `ApiError`.
- GIVEN a non-`http(s)` string in the research input
  WHEN the user submits
  THEN it is rejected inline (via `isHttpUrl`) with no request sent.

## Verification

Automated specs are node-only (no jsdom, per project convention):
`api-error.spec.ts`, `url.spec.ts`, extended `competitors-api.spec.ts`
(`researchCompetitor` + `ApiError` typing), and backend `openrouter.spec.ts` /
`research.spec.ts` (the `429` mapping). `ResearchBar`, `useCompetitors`, and the
App wiring are untested glue, like `useViewPreference`.

The live research round-trip is **deploy-verified** (vite dev does not serve
`api/`, needs `OPENROUTER_API_KEY` + DB), like M5's model check and M6/M7's write
path: research a URL and confirm the record appears; force a bad URL and a
throttle and confirm the inline messages. Locally, the loading/error/retry UI
states are exercised against the mock fallback.

## Out of scope / open questions

- Automatic retry/back-off and request cancellation — the user drives retries.
- None open.
