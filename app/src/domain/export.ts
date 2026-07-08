import type { Competitor, FeatureArea } from './competitor';
import { buildComparison } from './gap';

/**
 * Pure CSV export of the comparison (M8, FR-13). Builds a spreadsheet-friendly
 * table from the same `buildComparison` model the UI + Confluence page use — rows
 * = feature areas, columns = VA-INDIGO + each competitor, cells = rating labels,
 * VA-INDIGO gap cells suffixed `(gap)`. Dependency-free; the `Blob` download is
 * thin glue in `ExportBar`. Opens natively in Excel.
 */

/** Stable download filename. */
export const CSV_FILENAME = 'va-indigo-comparison.csv';

/**
 * Neutralize spreadsheet formula injection: a cell starting with `= + - @` (or a
 * tab/CR) is executed as a formula by Excel/Sheets, so prefix it with an
 * apostrophe to force it to be read as text. Applied before CSV quoting.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Escape a field for CSV: neutralize formulas, then quote if it contains `,` `"` or a newline. */
export function csvField(value: string): string {
  const safe = neutralizeFormula(value);
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvRow(cells: string[]): string {
  return cells.map(csvField).join(',');
}

export function toCsv(
  home: Competitor,
  competitors: Competitor[],
  areas?: readonly FeatureArea[],
): string {
  const model = buildComparison(home, competitors, areas);

  const header = ['Feature area', `${home.name} (VA-INDIGO)`, ...competitors.map((c) => c.name)];
  const rows = model.rows.map((r) =>
    csvRow([
      r.label,
      `${r.home.cell.label}${r.home.isGap ? ' (gap)' : ''}`,
      ...r.competitors.map((cell) => cell.label),
    ]),
  );

  return [csvRow(header), ...rows].join('\r\n');
}
