# ADR 009 — Deploy-time DB migrations + seed

## Context

ADR 007 introduced Drizzle migrations (`api/drizzle/`) and an idempotent seed
(`api/_scripts/seed.ts`), and deliberately left **applying** them as a manual
deploy/setup-time step ("needs a live DB, so it is not part of the test suite").

In practice that step was never wired into anything. When the app was first
deployed to Vercel against a freshly-provisioned Neon database, the schema was
empty: `GET /api/competitors` reached the DB and failed with
`DrizzleQueryError` (relation `competitors` does not exist). The frontend loads,
but every data round-trip 500s until someone remembers to run `db:migrate` +
`db:seed` by hand against the production connection string — a credential-handling
chore that is easy to forget and easy to get wrong.

`build` only builds the frontend (`vite build`); it never touches the DB.

## Decision

Run **`drizzle-kit migrate` then the seed** as part of the Vercel build, before
the frontend build, so a deploy always leaves the database schema in sync and
populated.

- **New api script** `db:deploy` = `drizzle-kit migrate && node
  --experimental-strip-types _scripts/seed.ts`. It composes the two existing
  scripts; both are **idempotent** (drizzle-kit tracks applied migrations in
  `__drizzle_migrations`; the seed upserts by URL id), so it is safe to run on
  every deploy.
- **`vercel.json` `buildCommand`** becomes
  `npm --prefix api run db:deploy && npm run build`. `npm --prefix api run`
  executes with cwd = `api/`, which is what `drizzle.config.ts` (relative `out:
  ./drizzle`) and the seed's relative imports already assume.
- **Credentials:** `DATABASE_URL` (falls back to `POSTGRES_URL`) is read from the
  Vercel build environment — the same env var the runtime uses. The Neon–Vercel
  integration provisions it for **Production and Preview**, so both get migrated;
  no secret is ever handled by hand or committed.
- **Node:** the seed uses native type stripping (`--experimental-strip-types`),
  available on the pinned Node 22 (`.nvmrc`).

## Consequences

- A deploy with no reachable DB (`DATABASE_URL` unset/invalid) **fails the build**
  loudly rather than shipping a half-broken API. This is intended: the DB is
  required for the app to function, so fail fast at deploy time.
- Migrations run at build time, not in a serverless function — no cold-start
  migration races, and the running functions never migrate.
- The seed only inserts the mock competitor rivals (upsert). Real data added
  later is untouched (different URL ids); re-seeding never deletes rows.
- Local `build`/`test`/`lint` are unchanged (they don't invoke `db:deploy`);
  the migrate/seed path is exercised on the real Vercel deploy, where the DB
  env vars exist.
