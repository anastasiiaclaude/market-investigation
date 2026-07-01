# Feature 002 — Vercel skeleton + health endpoint (M1)

Implements milestone **M1** of [the roadmap](../ROADMAP.md); governed by
[ADR 002](../decisions/002-add-backend.md) and
[ADR 003](../decisions/003-deploy-vercel-serverless.md).
Tracks [issue #1](https://github.com/anastasiiaclaude/market-investigation/issues/1).

## User story
As the developer of this project, I want the static frontend and a first
serverless function to build and deploy on Vercel, so I have a working
end-to-end skeleton (SPA + `api/`) to grow real features onto.

## Acceptance criteria
- GIVEN the repository
  WHEN Vercel builds it
  THEN the Vite + React frontend is built as a static SPA from `app/`
  AND it is served as the deployment's static output.
- GIVEN the deployed app
  WHEN a client sends `GET /api/health`
  THEN the serverless function responds with HTTP `200`
  AND a JSON body `{ "status": "ok" }`.
- GIVEN the pure `buildHealthResponse()` module
  WHEN called
  THEN it returns the health body, and `HEALTH_OK_STATUS` equals `200`.

## Design notes
- Backend lives in `api/` at the repo root (Vercel convention, per ADR 003).
- The handler is thin; the response shape lives in a pure module
  `api/_lib/health.ts` so it can be unit-tested (logic in pure modules).
  Vercel does not route paths beginning with `_`, so `_lib/` is helper-only.
- The function uses the web-standard `Request`/`Response` signature, so it
  needs no extra runtime dependency for M1.
- `vercel.json` wires the build: install + build `app/`, serve `app/dist`.

## Out of scope
- Any database, Postgres/Drizzle, or persisted state (M6).
- Any real research, extraction, or AI calls (M5).
- Authentication (out of scope per `docs/constraints.md`).

## Open questions
- None.
