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
  executes with cwd = `api/`, which is what the drizzle config (relative `out:
  ./drizzle`) and the seed's relative imports already assume.
- **Config + migrations must survive to build time.** The drizzle config and the
  `api/drizzle/` migrations were previously in `.vercelignore` — which strips
  files from the build entirely, so `drizzle-kit migrate` couldn't find them
  (`drizzle.config.json … does not exist`). Fix: delete `.vercelignore` and
  rename the config to `_drizzle.config.ts`. The `_` prefix is Vercel's own
  "not a serverless function" signal (same rule that protects `_lib`/`_scripts`)
  **but keeps the file in the build context**, which `.vercelignore` does not.
  Scripts point at it with `--config _drizzle.config.ts`. The `api/drizzle/`
  contents are `.sql`/`.json`, never built as functions, so they need no prefix.
- **Credentials:** `DATABASE_URL` (falls back to `POSTGRES_URL`) is read from the
  Vercel build environment — the same env var the runtime uses. No secret is ever
  handled by hand or committed.
- **Production only.** `db:deploy` is gated on `VERCEL_ENV = production` in the
  `buildCommand`. The Neon–Vercel integration was set up **without** per-branch
  database branches, so Preview and Production share one database; running
  migrate/seed on preview builds would mutate the production schema (and an
  unmerged migration would hit prod). Gating to production avoids that. Preview
  builds skip `db:deploy` entirely and read the shared DB read-only. (If per-branch
  Neon databases are enabled later, the gate can be relaxed to migrate previews
  against their own branch.)
- **Node:** the seed uses native type stripping (`--experimental-strip-types`),
  which needs Node ≥ 22.6. Vercel does **not** read `.nvmrc` for build Node
  selection, so the version is pinned via `engines.node = "22.x"` in both
  `package.json` files (and the Vercel project's Node setting is 22.x).

## Consequences

- A deploy with no reachable DB (`DATABASE_URL` unset/invalid) **fails the build**
  loudly rather than shipping a half-broken API. This is intended: the DB is
  required for the app to function, so fail fast at deploy time.
- Migrations run at build time, not in a serverless function — no cold-start
  migration races, and the running functions never migrate.
- The seed is **non-destructive** (`onConflictDoNothing`): it inserts a seeded
  rival only if its URL id is absent, so it fills gaps but never overwrites — user
  edits to a seeded rival made through the app **survive** the next deploy, and
  rows are never deleted. Tradeoff: a later change to a mock rival in the repo
  won't propagate to a row that already exists (acceptable — the mocks are a
  one-time baseline, not a source of truth to re-sync).
- Local `build`/`test`/`lint` are unchanged (they don't invoke `db:deploy`);
  the migrate/seed path is exercised on the real Vercel deploy, where the DB
  env vars exist.
