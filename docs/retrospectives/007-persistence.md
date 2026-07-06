# Retrospective 007 — Persistence + dedup (M6, Part A)

## What shipped

The backend half of M6 (feature 007, issue #6): competitors persist in Postgres
(Neon) via Drizzle, with research deduping by URL. Traces to FR-10 (CRUD) and
FR-11 (dedup on research).

- **`api/` is now its own sub-package** ([api/package.json](../../api/package.json)):
  `drizzle-orm` + `@neondatabase/serverless`, dev `drizzle-kit` + `@types/node`.
  Domain types are still imported transitively from `app/src` — only the DB
  libraries live in `api/`.
- **URL-based identity** ([app/src/domain/identity.ts](../../app/src/domain/identity.ts)):
  pure `websiteKey(url)` is the DB primary key = research dedup key = REST id.
  `toCompetitor` now sets `id = websiteKey(url)`, retiring M5's provisional slug.
- **Repository seam** ([api/_lib/db/](../../api/_lib/db/)): `CompetitorRepo`
  interface with a `drizzleRepo` (live) and an `inMemoryRepo` (tests). Pure CRUD
  controllers ([competitors-service.ts](../../api/_lib/db/competitors-service.ts))
  over the seam; thin handler [api/competitors.ts](../../api/competitors.ts).
- **Research upserts** — `runResearch` takes an optional `repo` and upserts by
  URL id, so a re-run updates the row instead of duplicating it.
- **Migration + seed** — `drizzle-kit generate` output in [api/drizzle/](../../api/drizzle/);
  idempotent `_scripts/seed.ts` re-keys the mock rivals by URL.

## Decisions

- **Sub-package over the Zod trick (ADR 007).** M5 kept `api/` dependency-free by
  importing Zod through `app/src`. That works for a browser-safe lib but not a
  Postgres driver, which must never enter the frontend bundle. So DB libs get an
  `api/node_modules`; domain types stay shared. Vercel installs both prefixes
  (`installCommand` + `.vercelignore`).
- **Swapped the deprecated driver.** ADR 003 named `@vercel/postgres` first, but
  `npm install` surfaced its deprecation notice (Vercel Postgres → Neon native).
  Since Neon was already the target, moved to `@neondatabase/serverless` +
  `drizzle-orm/neon-http` — recorded in ADR 007 rather than silently following
  the stale ADR.
- **`?id=` instead of a `[id]` route.** URL-key ids contain `/` and query chars,
  which a path segment can't carry. A single `/api/competitors` route with an
  `?id=` query param sidesteps all encoding/segment fragility.
- **`updated_at` stored as `text`.** Keeps the domain's ISO-8601 string verbatim
  so it round-trips through `z.iso.datetime()` — a `timestamptz` column would
  reformat it and fail validation on read.
- **Identity is the dedup key, not the name.** Slug-of-name would duplicate when
  the model renames a product between runs; the URL is stable. This is exactly
  what M5's `toCompetitor` comment deferred to M6.

## Notes for next time

- **The live DB path is deploy-verified only.** vite dev doesn't serve `api/`,
  and tests use `inMemoryRepo`, so `drizzleRepo` / `client.ts` / the migration /
  the seed are first exercised on Vercel with a real `DATABASE_URL`. Same shape
  as M5's live-model check. Confirm on the first deploy that `@neondatabase/serverless`
  bundles and the migration applies.
- **`api/` type-checking is still manual.** `npm run build`/`eslint` cover only
  `app/`. Ran `tsc --noEmit -p api/tsconfig.json` (exit 0) by hand; the retro-006
  note about wiring an api type-check into CI still stands and is now more urgent
  with the DB code.
- **Node TS execution for the seed.** `_scripts/seed.ts` runs via
  `node --experimental-strip-types` (Node 22+/24) — no `tsx` dependency, staying
  within the ADR-authorized dep set.
- **Part B is deferred by design.** The frontend still reads `MOCK_COMPETITORS`;
  wiring `App.tsx` to `GET /api/competitors` (with a mock fallback for vite-only
  dev) is the follow-up PR.
