import { describe, expect, it } from 'vitest';
import { RATINGS, type Rating } from './competitor';
import { ratingToCell } from './rating-cell';

describe('ratingToCell', () => {
  it('maps each rating to the expected label and symbol', () => {
    expect(ratingToCell('strong')).toMatchObject({ label: 'Strong', symbol: '●', severity: 3 });
    expect(ratingToCell('adequate')).toMatchObject({ label: 'Adequate', symbol: '◕', severity: 2 });
    expect(ratingToCell('weak')).toMatchObject({ label: 'Weak', symbol: '◔', severity: 1 });
    expect(ratingToCell('absent')).toMatchObject({ label: 'Absent', symbol: '—', severity: 0 });
  });

  it('gives every rating a distinct CSS class', () => {
    const classes = RATINGS.map((r) => ratingToCell(r).className);
    expect(new Set(classes).size).toBe(RATINGS.length);
  });

  it('echoes back the rating it was given', () => {
    for (const rating of RATINGS) {
      expect(ratingToCell(rating).rating).toBe(rating);
    }
  });

  it('orders severity strictly strong > adequate > weak > absent', () => {
    const order: Rating[] = ['strong', 'adequate', 'weak', 'absent'];
    const severities = order.map((r) => ratingToCell(r).severity);
    for (let i = 1; i < severities.length; i++) {
      expect(severities[i - 1]!).toBeGreaterThan(severities[i]!);
    }
  });
});
