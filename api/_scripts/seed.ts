// Seed the database with the mock competitor rivals (M6). Run against a live DB:
//   DATABASE_URL=... npm --prefix api run db:seed
// Idempotent — safe to re-run. VA-INDIGO is intentionally excluded (it stays a
// client-pinned home product, not a stored competitor).
import { getRepo } from '../_lib/db/client.ts';
import { seed } from '../_lib/db/seed.ts';
import { MOCK_COMPETITORS } from '../../app/src/mocks/competitors.ts';

const results = await seed(getRepo(), MOCK_COMPETITORS);
console.log(`Seeded ${results.length} competitors:`);
for (const c of results) console.log(`  ${c.id}  (${c.name})`);
