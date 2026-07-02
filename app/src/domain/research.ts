import { z } from 'zod';
import { competitorSchema, featuresSchema, type Competitor } from './competitor';

/**
 * What the LLM is asked to produce for a researched competitor: a name, a short
 * summary (stored as the competitor's `description`), and a rating for every
 * feature area. `featuresSchema` (a `z.strictObject`) enforces exhaustiveness in
 * both directions — the reason M2 built it that way (see competitor.ts).
 *
 * All Zod usage stays inside `app/src` so both the test runner and the Vercel
 * function bundler resolve `zod` from `app/node_modules`; `api/` imports this
 * module rather than depending on `zod` directly.
 */
export const researchResultSchema = z.strictObject({
  name: z.string().min(1),
  description: z.string().min(1),
  features: featuresSchema,
});

export type ResearchResult = z.infer<typeof researchResultSchema>;

/** Validate raw model output as a ResearchResult; throws on any violation. */
export function parseResearchResult(input: unknown): ResearchResult {
  return researchResultSchema.parse(input);
}

/** URL-safe slug from a display name; falls back so the id is never empty. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'competitor';
}

/**
 * Assemble a schema-valid `Competitor` from a researched result plus the posted
 * URL and a timestamp. The `id` is a provisional slug — real id/dedup is M6.
 */
export function toCompetitor(result: ResearchResult, url: string, now: Date): Competitor {
  return competitorSchema.parse({
    id: slugify(result.name),
    name: result.name,
    website: url,
    description: result.description,
    features: result.features,
    updatedAt: now.toISOString(),
  });
}
