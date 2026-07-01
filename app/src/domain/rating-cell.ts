import type { Rating } from './competitor';

/** Presentation descriptor for a single rating in the comparison table. */
export interface RatingCell {
  rating: Rating;
  label: string;
  /** Glyph shown in the cell. */
  symbol: string;
  /** Ordinal for sorting/comparison: strong=3 … absent=0. */
  severity: number;
  /** CSS class hook for the cell. */
  className: string;
}

const CELLS: Record<Rating, RatingCell> = {
  strong: { rating: 'strong', label: 'Strong', symbol: '●', severity: 3, className: 'rating-strong' },
  adequate: { rating: 'adequate', label: 'Adequate', symbol: '◕', severity: 2, className: 'rating-adequate' },
  weak: { rating: 'weak', label: 'Weak', symbol: '◔', severity: 1, className: 'rating-weak' },
  absent: { rating: 'absent', label: 'Absent', symbol: '—', severity: 0, className: 'rating-absent' },
};

/** Map a rating to its presentation cell. Pure; no gap logic (that is M3). */
export function ratingToCell(rating: Rating): RatingCell {
  return CELLS[rating];
}
