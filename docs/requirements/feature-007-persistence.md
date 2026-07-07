# Feature 007 — Persistence + dedup (Postgres + Drizzle)

Milestone **M6**, split into two parts. **Part A (done):** the backend — persist
competitors in Vercel Postgres (Neon) via Drizzle, expose CRUD through
`api/competitors`, and make `POST /api/research` upsert so re-runs never create
duplicates. **Part B (done):** wire the frontend read-path — `App.tsx` fetches
`GET /api/competitors`, with a mock fallback for vite-only dev. Traces to
**FR-10** (persist / CRUD) and **FR-11** (dedup on research).

Legalized by [ADR 003](../decisions/003-deploy-vercel-serverless.md) (persistence
on Postgres + Drizzle). The structural specifics — `api/` as its own sub-package,
the `@vercel/postgres` driver, and URL-based identity — are decided in
[ADR 007](../decisions/007-api-subpackage-drizzle.md).

## User story

As the product manager, I want researched competitors to be saved so they're
still there when I reload, and I want re-running research on the same URL to
update the existing record instead of creating a duplicate.

## Design decisions (confirmed)

- **URL-based identity.** A competitor's `id` becomes `websiteKey(url)` — a
  normalized form of its website (lowercase host, default port dropped, no
  trailing slash / hash / tracking params). This is simultaneously the primary
  key, the dedup key, and the REST resource id. It replaces M5's *provisional*
  name-slug id (whose comment already flagged "real id/dedup is M6"). Stable
  across re-research because the URL doesn't drift when the model renames a
  product. `websiteKey` is a pure, zod-free module in `app/src/domain/` so both
  the frontend and (transitively) `api/` share one implementation.
- **`api/` becomes a real sub-package** with its own `package.json` /
  `node_modules` for `drizzle-orm` + `@neondatabase/serverless` (the non-
  deprecated Neon driver replacing ADR 003's `@vercel/postgres`). The driver
  must never enter the frontend bundle, so DB code cannot live in `app/src` the
  way the Zod domain does. Domain types are still imported transitively from
  `app/src` (one source of truth). See ADR 007.
- **Repository seam for testability.** All DB access goes through a
  `CompetitorRepo` interface. A drizzle-backed impl runs in production; an
  in-memory impl backs node-only tests. Controllers and `runResearch` receive an
  injected repo (mirrors the injectable `fetchImpl` from M5), so no test touches
  a real database. The live Postgres path is **deploy-verified**, like M5's
  live-model check (vite dev does not serve `api/`).
- **Dedup enforced twice.** DB `PRIMARY KEY (id)` plus
  `INSERT … ON CONFLICT (id) DO UPDATE`. `runResearch` upserts the assembled
  `Competitor`; a second run on the same URL updates the row in place (FR-11).
- **Full CRUD surface (Part A).** `GET/POST /api/competitors` and
  `GET/PUT/DELETE /api/competitors/:id`. The M6 frontend only reads (Part B);
  PUT/DELETE are covered by tests and consumed by M7's form.
- **Seed from mocks.** An idempotent seed script upserts the existing
  `MOCK_COMPETITORS` rivals into the DB so a fresh database isn't empty.
  VA-INDIGO is **not** seeded — it stays a client-pinned home product.
- **Migrations via Drizzle Kit.** `drizzle-kit generate` produces committed SQL
  under `api/drizzle/`; applying it (`drizzle-kit migrate`) needs a live DB and
  is a deploy/setup-time step.

## API contract

The competitor id is the URL key (e.g. `acme.io/product`), which contains
slashes and query characters. Rather than fight path-segment encoding, by-id
operations pass the id as a **`?id=` query param** on a single `/api/competitors`
route — one handler file, no `[id]` dynamic route.

`GET /api/competitors` → `200` `Competitor[]` (validates against `competitorSchema`).

`GET /api/competitors?id=<id>` → `200` `Competitor`, or `404`.

`POST /api/competitors` body `Competitor` → `201` the upserted `Competitor`.

`PUT /api/competitors?id=<id>` body partial `Competitor` → `200` updated, or `404`.

`DELETE /api/competitors?id=<id>` → `204`, or `404`.

`POST /api/research` (unchanged contract) → `200` a `Competitor` that is now
**persisted** (upserted by URL id) before it is returned.

Errors are JSON `{ "error": string }`: `400` invalid body / missing `id` /
non-JSON body, `404` missing record, `500` DB not configured / DB error, plus
the existing research codes.

## Acceptance criteria

- GIVEN a valid `Competitor`
  WHEN `POST /api/competitors` runs
  THEN the record is upserted and a follow-up `GET /api/competitors` includes it.
- GIVEN two `POST /api/research` calls with the same URL
  WHEN both complete
  THEN the store holds exactly one competitor for that URL (the second updated
  the first) — verified in a unit test against the in-memory repo.
- GIVEN a raw website URL with a trailing slash, `www.`, a `:443` port, a hash,
  and a `utm_*` param
  WHEN `websiteKey` normalizes it
  THEN the same key results as for the bare `https://host/path` form.
- GIVEN a `PUT`/`DELETE` for an id that is not present
  WHEN the endpoint runs
  THEN it responds `404` without mutating the store.
- GIVEN the seed script run twice against the same store
  WHEN it completes
  THEN the competitor count is unchanged after the second run (idempotent).

## Verification

Automated specs are node-only against the in-memory repo (no DB, per project
convention). The live Postgres path is verified at deploy-time:
```
drizzle-kit migrate            # apply migration to Neon
npm run db:seed                # load mock rivals
curl -X POST …/api/research -d '{"url":"https://www.seeq.com/"}'   # twice
curl …/api/competitors         # exactly one Seeq record; persists across reloads
```

## Part B — frontend read-path (done)

- **Pure `app/src/domain/competitors-api.ts`** — `fetchCompetitors(fetchImpl)`
  GETs `/api/competitors` and validates each row against `competitorSchema`;
  throws on network failure, non-OK status, non-array body, or an invalid row.
  Node-tested with an injected fetch (no server, no jsdom) — the view-preference
  seam pattern.
- **Thin `useCompetitors` hook** — wires the fetch to React state. On any throw
  it falls back to `MOCK_COMPETITORS` so `npm run dev` (vite-only, `/api`
  unserved) still renders; a successful empty response stays empty (a valid
  state, not a fallback). Untested by design, like `useViewPreference`.
- **`App.tsx`** swaps the competitor source from `MOCK_COMPETITORS` to the hook;
  `VA_INDIGO` stays pinned, filter + view untouched. States: a "sample data"
  banner on fallback, a "Loading…" note while fetching, a distinct empty-DB note,
  and the existing filtered-empty note.

Part B acceptance:
- GIVEN the API returns a valid `Competitor[]`
  WHEN the dashboard loads
  THEN it renders those competitors (VA-INDIGO still pinned), no banner.
- GIVEN the fetch fails (e.g. vite-only dev, or a non-JSON/500 response)
  WHEN the dashboard loads
  THEN it shows the mock rivals plus the "sample data" banner.
- GIVEN a valid empty response
  WHEN the dashboard loads
  THEN it shows the empty-DB note, not the mock data.

## Out of scope

- Add/edit competitor form (M7, FR-5/FR-6).
- Cron-scheduled research, export, Jira/Confluence, rate limits (M8).
- Rich error/retry UX beyond the fallback banner (M8, FR-16).

## Open questions

- None.
