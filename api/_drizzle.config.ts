import { defineConfig } from 'drizzle-kit';

// Drizzle Kit config (ADR 007). `generate` emits SQL migrations under ./drizzle
// (committed); `migrate` applies them against the Neon database named by
// DATABASE_URL (falls back to POSTGRES_URL). Applying migrations runs at deploy
// time (ADR 009), not in the test suite.
//
// Underscore-prefixed (`_drizzle.config.ts`) so Vercel does NOT build it as a
// serverless function, while keeping it in the build context — unlike
// `.vercelignore`, which strips files entirely and would hide it from the
// build-time `drizzle-kit migrate`. Scripts pass it via `--config`. Paths below
// resolve relative to cwd = `api/` (scripts run with `npm --prefix api run`).
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '';

export default defineConfig({
  schema: './_lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
});
