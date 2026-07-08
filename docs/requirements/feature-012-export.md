# Feature 012 — Export the comparison to PDF/Excel (M8)

Milestone **M8**, fourth slice. Two buttons export the on-screen comparison: a
**CSV download** (opens in Excel) and **Print / Save as PDF** (the browser's native
print). Traces to **FR-13** (export the comparison to PDF/Excel).
[issue #8](https://github.com/anastasiiaclaude/market-investigation/issues/8).

**Dependency-free (route A).** No PDF/Excel library → no new runtime dependency →
**no ADR** (per `docs/constraints.md`). This is also the only M8 slice fully
verifiable locally — no external keys or deploy needed.

## User story

As the product manager, I want to pull the comparison out of the dashboard — into a
spreadsheet to slice further, or a PDF to drop into a deck/email — with one click.

## Design decisions (confirmed)

- **CSV = the "Excel" deliverable.** A pure `app/src/domain/export.ts` `toCsv(home,
  competitors, areas?)` builds a CSV from `buildComparison` (the same model the
  table/Confluence page use): header row `Feature area, <home> (VA-INDIGO), <each
  competitor>`; one row per feature area with the rating **label** text, and the
  VA-INDIGO cell suffixed `(gap)` where it's a gap. Proper CSV escaping (quote
  fields containing `,` `"` or newlines; double internal quotes). Node-tested.
- **Print-to-PDF = the "PDF" deliverable.** A "Print / Save as PDF" button calls
  `window.print()`. An `@media print` stylesheet hides the controls (toolbar,
  research bar, integrations, buttons, legend) and keeps the header + comparison
  table, so the printed/saved sheet is clean. No library.
- **WYSIWYG.** Both export the **currently visible** view — the filtered
  competitors + visible feature areas the table shows — not the whole DB. "Export
  what I'm looking at."
- **Download is thin glue.** The pure `toCsv` returns the text; `ExportBar.tsx`
  wraps it in a `Blob` (prefixed with a UTF-8 BOM so Excel reads `&`/`—` correctly),
  makes an object URL, and clicks a temporary `<a download>`. Untested glue, like
  the fetch hooks; the coverage is on `toCsv`.
- **Not gated on `ready`.** Unlike Jira/Confluence (which write to external systems
  and are gated on real data), export is a local read-only download — available for
  sample/fallback data too. Always enabled.

## Acceptance criteria

- GIVEN a home + competitors
  WHEN `toCsv` runs
  THEN row 1 is `Feature area,<home name> (VA-INDIGO),<competitor names…>` and there
  is one row per (visible) feature area with each rating's label; the VA-INDIGO cell
  is suffixed `(gap)` exactly when that area is a gap.
- GIVEN a competitor name or field containing a comma or quote
  WHEN `toCsv` runs
  THEN that field is wrapped in double quotes with internal quotes doubled, so the
  CSV column count stays correct.
- GIVEN an `areas` subset
  WHEN `toCsv` runs
  THEN only those rows appear, in canonical order (same semantics as
  `buildComparison`).
- GIVEN the print stylesheet
  WHEN the page is printed
  THEN the controls are hidden and the comparison table is shown.

## Verification

Node-only spec `app/src/domain/export.spec.ts` (CSV shape, rating labels, gap
suffix, escaping, area subset). `ExportBar` + the download/print glue are untested,
like `useCompetitors`. Browser-verified in the preview: both buttons render and are
enabled against the sample data, "Download CSV" triggers a download with no console
error, and the `@media print` rules hide the controls (checked via print-media
emulation).

## Out of scope

- True `.xlsx` / `.pdf` binaries with formatting (that's route B — needs libraries
  + an ADR).
- Per-competitor card exports; server-side generation; choosing columns.

## Open questions

- None.
