import type { Competitor, FeatureArea } from './competitor';
import { FEATURE_AREAS, FEATURE_AREA_LABELS } from './competitor';
import { ratingToCell, type RatingCell } from './rating-cell';

/**
 * A VA-INDIGO (home) cell is a *gap* when it is weak or absent AND at least one
 * competitor rates strictly higher in that area — a real competitive shortfall,
 * not merely a weakness the whole market shares. Traces to FR-4.
 */
export function isGap(
  area: FeatureArea,
  home: Competitor,
  competitors: Competitor[],
): boolean {
  const homeSeverity = ratingToCell(home.features[area]).severity;
  // strong/adequate (severity ≥ 2) are never gaps.
  if (homeSeverity > ratingToCell('weak').severity) return false;
  return competitors.some(
    (c) => ratingToCell(c.features[area]).severity > homeSeverity,
  );
}

/** The home cell for a feature area, with its gap flag resolved. */
export interface HomeCell {
  cell: RatingCell;
  isGap: boolean;
}

/** One matrix row: a feature area with the home cell and the competitor cells. */
export interface ComparisonRow {
  area: FeatureArea;
  label: string;
  home: HomeCell;
  /** Aligned to the competitor order passed to `buildComparison`. */
  competitors: RatingCell[];
}

/** The full comparison model consumed by the table component. */
export interface ComparisonModel {
  home: Competitor;
  competitors: Competitor[];
  rows: ComparisonRow[];
}

/**
 * Shape the home product and competitors into a render-ready comparison model:
 * one row per feature area (canonical `FEATURE_AREAS` order), each carrying the
 * presentation cells plus the home gap flag. Pure — the component only renders.
 */
export function buildComparison(
  home: Competitor,
  competitors: Competitor[],
): ComparisonModel {
  const rows: ComparisonRow[] = FEATURE_AREAS.map((area) => ({
    area,
    label: FEATURE_AREA_LABELS[area],
    home: {
      cell: ratingToCell(home.features[area]),
      isGap: isGap(area, home, competitors),
    },
    competitors: competitors.map((c) => ratingToCell(c.features[area])),
  }));
  return { home, competitors, rows };
}
