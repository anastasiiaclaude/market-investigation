# Retrospective 012 — Export to PDF/Excel (M8, FR-13)

## What shipped

Two export buttons on the dashboard: **Download CSV** (opens in Excel) and
**Print / Save as PDF** (the browser's native print). Dependency-free — no library,
**no ADR** — and the first M8 slice fully verifiable locally.

- **Pure** `app/src/domain/export.ts`: `toCsv(home, competitors, areas?)` builds the
  CSV from the same `buildComparison` model the table/Confluence page use (header =
  Feature area + VA-INDIGO + each competitor; rows = rating labels; VA-INDIGO gap
  cells suffixed `(gap)`), with CSV escaping + **formula-injection neutralization**.
- **Glue** `ExportBar.tsx`: builds a `Blob` (UTF-8 BOM so Excel reads `&`/`—`) and
  clicks a temporary `<a download>`; the PDF button is `window.print()`.
- **Styles**: an `@media print` block hides the controls and keeps the header +
  comparison table.

## Key decisions

- **Route A (dependency-free)** over real `.xlsx`/`.pdf` binaries: CSV opens in
  Excel, print-to-PDF is the browser's Save-as-PDF. Matches `constraints.md`
  (no new dep) and stays local-verifiable.
- **WYSIWYG** — exports the currently visible (filtered) competitors + areas.
- **Not gated on `ready`** (unlike Jira/Confluence): export is a local read-only
  download, safe against sample/fallback data.

## Review-driven change

- **CSV formula injection** (from the review): a competitor name like `=HYPERLINK(…)`
  or `+cmd` (from research/the form) would execute as a formula in Excel/Sheets.
  Added `neutralizeFormula` — a leading `= + - @` / tab / CR gets an apostrophe
  prefix — mirroring the project's earlier `javascript:`-URL hardening. Applied
  inside `csvField` before quoting; node-tested.
- Review was done inline (not the 3-agent fan-out): the surface is one pure function
  + thin glue + static CSS, and was verified live in the preview.

## Verification

218 node specs (CSV shape, rating labels, gap suffix, escaping, area subset,
formula neutralization), lint + build clean. Browser-verified in the preview:
both buttons render, the CSV download carries the right content **and a real
UTF-8 BOM in the bytes** (`EF BB BF`, checked via `arrayBuffer`), no console
errors, and the `@media print` rule compiled with the correct hide-selectors.

## Follow-ups

- Last M8 slice: **Cron scheduled research (FR-12)** — then M8 is complete.
- If branded/styled PDF or true multi-sheet Excel is ever needed, that's route B
  (libraries + an ADR).
