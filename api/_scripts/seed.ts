// Seed the database with the mock competitor rivals (M6). Run against a live DB:
//   DATABASE_URL=... npm --prefix api run db:seed
// Idempotent and non-destructive — inserts a seeded rival only if its URL id is
// not already present (`onConflictDoNothing`). It fills gaps but never overwrites
// existing rows, so user edits to a seeded rival survive re-seeding (this runs on
// every deploy — ADR 009). Tradeoff: later changes to a mock rival in the repo
// won't propagate to a row that already exists. VA-INDIGO is intentionally
// excluded (it stays a client-pinned home product, not a stored competitor).
//
// Self-contained on purpose: it imports only the schema, `websiteKey`, and the
// mock data — all modules whose own imports are type-only or package-level — so
// it runs under Node's native TS execution (`--experimental-strip-types`), which
// cannot resolve the extensionless relative imports used elsewhere in `api/`.
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { competitors } from '../_lib/db/schema.ts';
import { websiteKey } from '../../app/src/domain/identity.ts';
import { MOCK_COMPETITORS } from '../../app/src/mocks/competitors.ts';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  throw new Error('DATABASE_URL (or POSTGRES_URL) is not set.');
}

const db = drizzle(neon(url));

for (const competitor of MOCK_COMPETITORS) {
  const row = { ...competitor, id: websiteKey(competitor.website) };
  await db.insert(competitors).values(row).onConflictDoNothing({ target: competitors.id });
  console.log(`  ensured ${row.id}  (${row.name})`);
}

const all = await db.select().from(competitors);
console.log(`Seeded ${MOCK_COMPETITORS.length} competitors; table now holds ${all.length} rows.`);
