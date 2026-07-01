import type { Competitor } from '../domain/competitor';
import { buildComparison } from '../domain/gap';
import type { RatingCell } from '../domain/rating-cell';

interface CompetitorTableProps {
  home: Competitor;
  competitors: Competitor[];
}

/** A rating cell. `home` styles the pinned column; `gap` flags a home shortfall. */
function Cell({
  cell,
  home = false,
  gap = false,
}: {
  cell: RatingCell;
  home?: boolean;
  gap?: boolean;
}) {
  const label = gap ? `${cell.label} — gap vs. competitors` : cell.label;
  const classes = ['cell', cell.className];
  if (home) classes.push('home-col');
  if (gap) classes.push('is-gap');
  return (
    <td className={classes.join(' ')} title={label} aria-label={label}>
      <span className="cell-symbol" aria-hidden="true">
        {cell.symbol}
      </span>
      {gap && (
        <span className="gap-flag" aria-hidden="true">
          ⚠
        </span>
      )}
    </td>
  );
}

/**
 * Comparison matrix: feature areas as rows, products as columns. VA-INDIGO
 * (the home product) is pinned as the first, highlighted column; its gaps vs.
 * competitors are flagged. Pure rendering — the model is built in `domain/gap`.
 */
export default function CompetitorTable({ home, competitors }: CompetitorTableProps) {
  const model = buildComparison(home, competitors);

  return (
    <table className="comparison">
      <thead>
        <tr>
          <th scope="col" className="corner">
            Feature area
          </th>
          <th scope="col" className="home-col">
            {model.home.name}
            <span className="home-badge">Your product</span>
          </th>
          {model.competitors.map((c) => (
            <th scope="col" key={c.id}>
              {c.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {model.rows.map((row) => (
          <tr key={row.area}>
            <th scope="row">{row.label}</th>
            <Cell cell={row.home.cell} home gap={row.home.isGap} />
            {row.competitors.map((cell, i) => (
              <Cell key={model.competitors[i]!.id} cell={cell} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
