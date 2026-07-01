import { z } from 'zod';

/**
 * Rating scale for a competitor's coverage of a feature area.
 * Fixed by the PRD; ordered strongest → weakest.
 */
export const RATINGS = ['strong', 'adequate', 'weak', 'absent'] as const;
export const ratingSchema = z.enum(RATINGS);
export type Rating = z.infer<typeof ratingSchema>;

/**
 * The functional areas competitors are compared across (matrix rows).
 * Extend only via an ADR — see docs/requirements/feature-003-comparison-core.md.
 */
export const FEATURE_AREAS = [
  'realtime-dashboards',
  'data-integration',
  'trend-analytics',
  'quality-analytics',
  'alerting',
  'reporting',
] as const;
export const featureAreaSchema = z.enum(FEATURE_AREAS);
export type FeatureArea = z.infer<typeof featureAreaSchema>;

export const FEATURE_AREA_LABELS: Record<FeatureArea, string> = {
  'realtime-dashboards': 'Real-time KPI dashboards',
  'data-integration': 'Machine & data-source integration',
  'trend-analytics': 'Trend analysis',
  'quality-analytics': 'Process & quality analytics',
  alerting: 'Alerting & notifications',
  reporting: 'Reporting & export',
};

/**
 * Every feature area must carry a rating — built explicitly (rather than a
 * partial record) so a missing area fails validation. `strictObject` also
 * rejects unknown areas, so exhaustiveness is enforced in both directions
 * (important once this schema validates LLM output in M5).
 */
const featuresShape = Object.fromEntries(
  FEATURE_AREAS.map((area) => [area, ratingSchema]),
) as Record<FeatureArea, typeof ratingSchema>;
export const featuresSchema = z.strictObject(featuresShape);

export const competitorSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  website: z.url(),
  description: z.string(),
  features: featuresSchema,
  updatedAt: z.iso.datetime(),
});

export type Competitor = z.infer<typeof competitorSchema>;

/** Validate unknown input as a Competitor; throws on any violation. */
export function parseCompetitor(input: unknown): Competitor {
  return competitorSchema.parse(input);
}
