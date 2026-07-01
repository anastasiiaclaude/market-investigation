import type { Competitor, FeatureArea } from './competitor';
import { FEATURE_AREAS } from './competitor';

/**
 * Filter state driving both views. `query` is free text; `areas` is the set of
 * selected feature areas (empty means "all"). Pure — the toolbar owns the UI,
 * this module owns the semantics. Traces to FR-7.
 */
export interface FilterState {
  query: string;
  areas: FeatureArea[];
}

export const EMPTY_FILTER: FilterState = { query: '', areas: [] };

/**
 * Narrow competitors by a case-insensitive substring match on name or
 * description. An empty/whitespace query keeps everyone; input order is
 * preserved. VA-INDIGO is filtered by the caller's choice — this operates only
 * on the list it is given.
 */
export function filterCompetitors(
  competitors: Competitor[],
  query: string,
): Competitor[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return competitors;
  return competitors.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      c.description.toLowerCase().includes(needle),
  );
}

/**
 * Resolve the selected feature areas to the ones to render, always in canonical
 * `FEATURE_AREAS` order (so row/line order stays stable) and de-duplicated. An
 * empty selection means "all areas".
 */
export function visibleAreas(selected: FeatureArea[]): FeatureArea[] {
  if (selected.length === 0) return [...FEATURE_AREAS];
  const chosen = new Set(selected);
  return FEATURE_AREAS.filter((area) => chosen.has(area));
}
