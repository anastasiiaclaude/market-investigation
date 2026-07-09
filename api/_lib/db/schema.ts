import { pgTable, text, jsonb } from 'drizzle-orm/pg-core';
import type { Competitor } from '../../../app/src/domain/competitor.js';

/**
 * The `competitors` table (M6, ADR 007). Columns mirror the `Competitor` domain
 * schema one-to-one so a row maps to the domain type without transformation.
 *
 * - `id` is the URL-based `websiteKey` (see app/src/domain/identity.ts): the
 *   primary key AND the research dedup key. `INSERT … ON CONFLICT (id)` makes a
 *   re-run of research on the same URL update the row instead of duplicating it.
 * - `features` is stored as `jsonb`, typed as the domain `features` record.
 * - `updatedAt` is stored as `text` holding the domain's ISO-8601 string
 *   verbatim, so it round-trips through `z.iso.datetime()` without any
 *   timestamptz format/timezone reinterpretation.
 */
export const competitors = pgTable('competitors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  website: text('website').notNull(),
  description: text('description').notNull(),
  features: jsonb('features').$type<Competitor['features']>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type CompetitorRow = typeof competitors.$inferSelect;
