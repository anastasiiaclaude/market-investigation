import { z } from 'zod';
import { competitorSchema, featuresSchema, type Competitor } from './competitor';
import { websiteKey } from './identity';

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

/**
 * Assemble a schema-valid `Competitor` from a researched result plus the posted
 * URL and a timestamp. The `id` is the URL-based `websiteKey` (M6, ADR 007): the
 * DB primary key, the research dedup key, and the REST resource id in one. Stable
 * across re-research because it derives from the URL, not the (drift-prone) name.
 */
export function toCompetitor(result: ResearchResult, url: string, now: Date): Competitor {
  return competitorSchema.parse({
    id: websiteKey(url),
    name: result.name,
    website: url,
    description: result.description,
    features: result.features,
    updatedAt: now.toISOString(),
  });
}
