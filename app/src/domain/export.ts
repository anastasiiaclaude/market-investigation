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

/** Quote a field containing a comma, quote, or newline; double internal quotes. */
export function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
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
