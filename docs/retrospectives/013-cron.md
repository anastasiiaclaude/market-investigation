# Retrospective 013 — Cron scheduled research (M8, FR-12)

## What shipped

A **Vercel Cron** job (`GET /api/cron`, daily at 06:00 UTC) that re-researches every
saved competitor and refreshes the DB — no user action. **Completes M8** (the final
milestone).

- **Pure** `api/_lib/cron.ts` `refreshAllCompetitors({ repo, apiKey, model,
  fetchImpl?, now? })`: lists competitors, re-runs the existing `runResearch` per
  item (fetch → summarize → `repo.upsert`, dedup by `websiteKey` → update in place),
  with **per-competitor failure isolation** → `{ refreshed: id[], failed:
  {id,error}[] }`. Node-tested (in-memory repo + stubbed `fetch`).
- **Handler** `api/cron.ts`: verifies `CRON_SECRET` (500 if unset) + the
  `Authorization: Bearer <secret>` Vercel Cron sends (401), then config + refresh.
- **Config** `vercel.json` `crons` + `CRON_SECRET` in `.env.example`.

## Key decisions

- **Reuse `runResearch`** rather than re-implement the pipeline — cron is just the
  loop + a schedule.
- **Failure isolation**: one flaky site / OpenRouter `429` (common on the free
  Gemma tier) is recorded, the batch continues, and the next day retries — no manual
  recovery.
- **Protected endpoint**: the one write endpoint reachable on a schedule verifies a
  bearer secret (fails closed if `CRON_SECRET` is unset), unlike the ad-hoc write
  endpoints tracked in #25.
- **Daily** fits the Vercel Hobby cron limit (once/day).

## Lesson: the ESM `.js`-extension invariant (re-learned)

`api/` is native ESM on Vercel, so **every relative import must end in `.js`** or the
function crashes with `ERR_MODULE_NOT_FOUND` — and `build`/`test`/`tsc` do NOT catch
a miss (they resolve `.js`→`.ts`). The Jira (feature-010) and
Confluence (feature-011) handlers I wrote earlier this session merged with
extensionless imports and had to be fixed to `.js` (PR #27 territory) before the
deploy worked — I hadn't internalised the invariant despite it being documented in
CLAUDE.md's "Load-bearing invariants". For cron I applied `.js` from the first
keystroke and verified every import against `api/_lib/research.ts`. Takeaway: a
documented invariant only helps if you actually check new code against it — `tsc`
won't.

## Verification

225 node specs (refresh-all: all-ok / per-item isolation / empty repo; handler:
401 / 500-unconfigured / 200 summary), lint + `app` build + `api` `tsc` clean. Cron
runs only on Vercel, so the live check is deploy-time: `GET /api/cron` without the
bearer → 401 (safe to curl on the live app), then a manual authed trigger from the
Vercel dashboard refreshes the rows (confirm via `GET /api/competitors` `updatedAt`).

## Follow-ups

- **M8 complete** — all of FR-12…FR-16 shipped.
- Open: unauthenticated ad-hoc write endpoints (#25); SSRF residual (#15).
