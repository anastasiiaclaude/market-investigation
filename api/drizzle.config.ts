import { defineConfig } from 'drizzle-kit';

// Drizzle Kit config (ADR 007). `generate` emits SQL migrations under ./drizzle
// (committed); `migrate` applies them against the Neon database named by
// DATABASE_URL (falls back to POSTGRES_URL). Applying migrations needs a live DB,
// so it is a deploy/setup-time step, not part of the test suite.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '';

export default defineConfig({
  schema: './_lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
});
