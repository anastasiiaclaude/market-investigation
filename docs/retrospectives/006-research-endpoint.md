# Retrospective 006 — Research endpoint (M5)

## What shipped

`POST /api/research` (feature 006): given `{ url }`, the serverless function
fetches the competitor page, extracts clean text ([extract.ts](../../api/_lib/extract.ts),
ADR 005), summarizes + rates it via OpenRouter ([openrouter.ts](../../api/_lib/openrouter.ts) +
[summarize.ts](../../api/_lib/summarize.ts), ADR 004), and returns a schema-valid
`Competitor` ([research.ts](../../api/_lib/research.ts) orchestrator +
[api/research.ts](../../api/research.ts) handler). Traces to FR-8 and FR-9.
First feature to run real server-side logic + a live LLM call. Not persisted
(M6) and not wired to the UI (M7).

## Decisions

- **All Zod stays in `app/src`; `api/` imports it transitively.** The model-output
  schema (`researchResultSchema`) and the `ResearchResult → Competitor` assembler
  (`toCompetitor`) live in [app/src/domain/research.ts](../../app/src/domain/research.ts),
  reusing M2's `featuresSchema`/`competitorSchema`. `api/` never imports `zod`
  directly — so both vitest (root) and Vercel's esbuild bundler resolve `zod`
  from `app/node_modules` via the import graph. One source of truth for the
  rating scale, backend stays dependency-free.
- **Dependency-free extraction.** `extract` is a pure regex/string function
  (drop `script/style/nav/header/footer/...`, strip tags, decode common
  entities, collapse whitespace, truncate to a char budget), tested on inline
  HTML fixtures — no readability lib, no network in tests. ADR 005 keeps the
  library as a pre-authorized fallback if real pages need it.
- **Return a full `Competitor` (unpersisted).** The model yields `name`,
  `description` (the summary), and the six `features`; the handler fills
  `website` (posted URL), `updatedAt` (now), and a provisional slug `id`.
  Ready for M7's form without a DB.
- **Basic guardrails only (M8 owns robustness).** 400 (bad JSON / invalid
  http(s) url), 500 (no `OPENROUTER_API_KEY`, checked before any network), 502
  (fetch / model / validation failure). Empty/JS-page detection, size/rate
  limits, and retries deferred to M8.
- **Injectable `fetchImpl` everywhere.** `callOpenRouter` and `runResearch`
  take an optional `fetchImpl` (defaults to global `fetch`); the handler spec
  stubs the global. Keeps every layer node-testable with zero network.

## Notes for next time

- **`api/` had no Node types.** First handler to read `process.env`; `api/`
  has no `node_modules`, so `@types/node` won't resolve there. Added a minimal
  ambient [api/env.d.ts](../../api/env.d.ts) (`declare const process`) instead
  of a dep — keeps the "web-standard, dependency-free handlers" line from ADR 003.
- **`api/` is not in any automated gate.** `npm run build` builds only `app/`,
  `eslint .` runs only in `app/`. `api/` type errors surface only via
  `tsc --noEmit -p api/tsconfig.json` (run manually here) and at Vercel deploy.
  Worth wiring an api type-check into a script/CI later.
- **Live-model verification is deploy-time.** Local `npm run dev` is vite-only —
  it does not serve `api/*`. The issue's "returns from a live model" check needs
  `vercel dev` or a deploy with a real `OPENROUTER_API_KEY`; automated specs mock
  the network. Same shape as M1's health endpoint (unit-tested only locally).
- **Verify `zod` bundling on first deploy.** The transitive-import scheme works
  locally; confirm the Vercel function actually bundles `zod` on the first
  deploy that exercises `/api/research`.
