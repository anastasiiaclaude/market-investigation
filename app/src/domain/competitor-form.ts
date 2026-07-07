import {
  FEATURE_AREAS,
  competitorSchema,
  type Competitor,
  type FeatureArea,
  type Rating,
} from './competitor';
import { websiteKey } from './identity';
import { isHttpUrl } from './url';

/**
 * Pure form logic for the add/edit competitor form (M7, FR-5/FR-6). The
 * component (`CompetitorForm.tsx`) only renders + wires inputs; every value
 * transform and validation rule lives here so it stays node-testable — the
 * project's logic/rendering split.
 *
 * Values are all strings (what `<input>`/`<select>` hold). `toCompetitor`
 * assembles the persisted shape: `id = websiteKey(website)` and a fresh
 * `updatedAt`, validated through `competitorSchema` (the single write-side
 * validation boundary — same schema the API enforces).
 */
export interface CompetitorFormValues {
  name: string;
  website: string;
  description: string;
  features: Record<FeatureArea, Rating>;
}

/** Which fields failed validation, keyed by field name. Empty = valid. */
export type FormErrors = Partial<Record<'name' | 'website', string>>;

/** A competitor's ratings default to `absent` so a new one starts empty-but-valid. */
function blankFeatures(): Record<FeatureArea, Rating> {
  return Object.fromEntries(FEATURE_AREAS.map((area) => [area, 'absent'])) as Record<
    FeatureArea,
    Rating
  >;
}

/** Blank values for the create form. */
export function emptyFormValues(): CompetitorFormValues {
  return { name: '', website: '', description: '', features: blankFeatures() };
}

/** Pre-fill the edit form from an existing competitor. */
export function toFormValues(competitor: Competitor): CompetitorFormValues {
  return {
    name: competitor.name,
    website: competitor.website,
    description: competitor.description,
    features: { ...competitor.features },
  };
}

/**
 * Field-level validation for inline error messages. Mirrors the subset of
 * `competitorSchema` the user controls (name + website); ratings come from
 * fixed `<select>`s and description is unconstrained, so neither can be invalid.
 * `toCompetitor` re-validates the whole record, so this is UX, not the guard.
 */
export function validate(values: CompetitorFormValues): FormErrors {
  const errors: FormErrors = {};

  if (values.name.trim() === '') {
    errors.name = 'Name is required.';
  }

  const website = values.website.trim();
  if (website === '') {
    errors.website = 'Website is required.';
  } else if (!isHttpUrl(website)) {
    errors.website = 'Website must be a valid http(s) URL.';
  }

  return errors;
}

/**
 * Assemble a persisted `Competitor` from form values. The `id` is always the
 * URL key (never user-entered) and `updatedAt` is bumped to `now` on every save.
 * Throws (via `competitorSchema`) if values are invalid — callers gate on
 * `validate` first, so a throw here is a programming error, not user input.
 */
export function toCompetitor(values: CompetitorFormValues, now: Date): Competitor {
  const website = values.website.trim();
  return competitorSchema.parse({
    id: websiteKey(website),
    name: values.name.trim(),
    website,
    description: values.description.trim(),
    features: values.features,
    updatedAt: now.toISOString(),
  });
}
