import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { drizzleRepo, type CompetitorRepo } from './repository.js';

// Live Postgres wiring (ADR 007). Isolated here so every other layer stays pure
// and node-testable against the in-memory repo. Not exercised by the test suite;
// verified at deploy-time (vite dev does not serve `api/`).

let cached: CompetitorRepo | undefined;

/** Thrown when the DB connection string is absent — surfaced by handlers as 500. */
export class DbNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not configured');
    this.name = 'DbNotConfiguredError';
  }
}

/**
 * The production `CompetitorRepo`, backed by Neon over HTTP. Reads the
 * connection string from `DATABASE_URL` (falls back to `POSTGRES_URL`). Cached
 * across invocations within a warm function instance.
 */
export function getRepo(): CompetitorRepo {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new DbNotConfiguredError();
  if (!cached) cached = drizzleRepo(drizzle(neon(url)));
  return cached;
}
