# Feature 013 — Cron scheduled research (M8)

Milestone **M8**, final slice. A **Vercel Cron** job re-runs research on every saved
competitor once a day and refreshes the DB — no user action. Traces to **FR-12**
(schedule periodic research). Builds on M5's `runResearch` + M6's `CompetitorRepo`.
[issue #8](https://github.com/anastasiiaclaude/market-investigation/issues/8).

No new runtime dependency → no ADR.

## User story

As the product manager, I want competitor data to refresh itself on a schedule, so
the dashboard stays current without me clicking "Research" on each one.

## Design decisions (confirmed)

- **Reuse the research engine.** For each saved competitor, call the existing
  `runResearch({ url: competitor.website, apiKey, model, repo })` — fetch →
  summarize → `repo.upsert`. Upsert dedups by `websiteKey`, so a re-run **updates
  the row in place** (never duplicates). VA-INDIGO is a client-pinned mock, not in
  the DB, so it is untouched.
- **Per-competitor failure isolation.** The batch loops with a try/catch per
  competitor: one failure (e.g. an OpenRouter `429` on the free tier, or a page that
  won't fetch) is recorded and the loop continues. Returns
  `{ refreshed: id[], failed: { id, error }[] }`. The next day's run retries the
  failures — no manual recovery.
- **Pure orchestration, thin handler.** `api/_lib/cron.ts` `refreshAllCompetitors(
  { repo, apiKey, model, fetchImpl?, now? })` holds the loop (node-tested with the
  in-memory repo + a stubbed `fetch`). `api/cron.ts` (`GET /api/cron`) is the thin
  Vercel entry: auth → config → call → summary. Mirrors `api/research.ts`.
- **Protected endpoint.** Vercel sends `Authorization: Bearer <CRON_SECRET>` to cron
  routes. The handler requires `CRON_SECRET` (→ `500` if unset) and rejects a
  missing/wrong bearer with `401`. This closes the write surface that the ad-hoc
  endpoints leave open (see #25) for the one endpoint reachable on a schedule.
- **Daily schedule.** `vercel.json` gains
  `"crons": [{ "path": "/api/cron", "schedule": "0 6 * * *" }]` — 06:00 UTC daily
  (once/day fits the Vercel Hobby cron limit). `CRON_SECRET` documented in
  `.env.example`.
- **`.js` import extensions** on every relative import in the new `api/` files
  (ESM-on-Vercel invariant — local `build`/`test`/`tsc` do not catch a miss).

## API contract

`GET /api/cron` (invoked by Vercel Cron)
- `Authorization: Bearer <CRON_SECRET>` required.
- `200`: `{ refreshed: string[], failed: { id: string; error: string }[] }`.
- `401` missing/wrong bearer · `500` `CRON_SECRET`/`OPENROUTER_API_KEY`/DB not configured.

## Acceptance criteria

- GIVEN a repo with N saved competitors and a working research pipeline
  WHEN `refreshAllCompetitors` runs
  THEN each competitor is re-researched and upserted, and every id appears in
  `refreshed` with `failed` empty.
- GIVEN one competitor whose page fetch (or summarization) fails
  WHEN `refreshAllCompetitors` runs
  THEN that id is in `failed` with its error, the others are still `refreshed`, and
  the batch does not throw.
- GIVEN a request without a valid `Authorization: Bearer <CRON_SECRET>`
  WHEN `GET /api/cron` runs
  THEN it returns `401` and never touches OpenRouter or the DB.
- GIVEN `CRON_SECRET` (or the OpenRouter key / DB url) is unset
  WHEN `GET /api/cron` runs
  THEN it returns `500` with a clear message.

## Verification

Node-only specs: `api/_lib/cron.spec.ts` (refresh-all: all-ok, per-item failure
isolation, empty repo) and `api/cron.spec.ts` (auth 401/500, config 500, 200 summary
with a stubbed fetch + mocked db client — mirrors `api/research.spec.ts`).

Deploy-verified on the live Vercel app: `GET /api/cron` without the bearer → `401`
(safe to curl); an authed manual trigger from the Vercel dashboard refreshes the
rows (confirm via `GET /api/competitors` `updatedAt` bumps); the schedule then runs
daily.

## Out of scope

- Per-competitor schedules, backoff/retry within a run, partial-batch time budgeting
  (fine for the current handful of competitors).
- A UI for the schedule or a "last refreshed" indicator.
- Notifications on failure.

## Open questions

- None.
