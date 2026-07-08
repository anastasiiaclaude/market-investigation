import type { Competitor, FeatureArea } from '../domain/competitor';
import { CSV_FILENAME, toCsv } from '../domain/export';

interface ExportBarProps {
  home: Competitor;
  /** The currently visible competitors (filtered) — export is WYSIWYG. */
  competitors: Competitor[];
  /** The currently visible feature areas. */
  areas: readonly FeatureArea[];
}

/** UTF-8 byte-order mark (U+FEFF) so Excel reads non-ASCII (e.g. "&", "—") correctly. */
const BOM = String.fromCharCode(0xfeff);

/** Trigger a client-side download of `text` as `filename`. */
function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([BOM + text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export controls for the comparison (M8, FR-13): a CSV download (opens in Excel)
 * and Print / Save as PDF (the browser's native print, styled via `@media print`).
 * Dependency-free; the pure CSV lives in `domain/export.ts`, this is the thin
 * download/print glue. Exports the currently visible view.
 */
export default function ExportBar({ home, competitors, areas }: ExportBarProps) {
  const onCsv = () =>
    downloadText(CSV_FILENAME, toCsv(home, competitors, areas), 'text/csv;charset=utf-8');

  return (
    <div className="export-bar">
      <button type="button" className="btn" onClick={onCsv}>
        Download CSV
      </button>
      <button type="button" className="btn" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
    </div>
  );
}
