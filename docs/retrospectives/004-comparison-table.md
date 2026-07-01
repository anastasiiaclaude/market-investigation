# Retrospective 004 — Comparison table render + gap highlighting (M3)

## What shipped

The first real UI: [`CompetitorTable`](../../app/src/components/CompetitorTable.tsx)
renders the comparison matrix (feature areas as rows, products as columns) from
mock data, with **VA-INDIGO** pinned as a highlighted first column and its
competitive gaps flagged. Traces to FR-1 and FR-4.

## Decisions

- **Gap = relative, not absolute.** A VA-INDIGO cell is a gap only when it is
  `weak`/`absent` **and** a competitor rates strictly higher — matching FR-4's
  "vs. competitors" over the issue's looser "weak/absent" wording. Confirmed
  with the product owner before coding.
- **Home product modelled separately.** `VA_INDIGO` is its own `Competitor`
  constant in `mocks/competitors.ts`, not a member of `MOCK_COMPETITORS`. No
  `isHome` flag was added to the schema — the split keeps "home vs. rivals" a
  call-site concern and the schema unchanged.
- **Logic in a pure module, spec-first.** Gap detection and the render-ready
  matrix live in [`domain/gap.ts`](../../app/src/domain/gap.ts)
  (`isGap`, `buildComparison`) with a failing-first spec; the component only
  renders. This kept the node-only test setup intact — no `jsdom` /
  testing-library dependency, so no new ADR was needed.

## Notes for next time

- **`severity` from `ratingToCell` is the single source of ordering.** `isGap`
  reuses it ("strictly higher" = higher severity) instead of re-encoding the
  rating order, so M2 stays the one place the scale is defined.
- **Real `.rating-*` CSS landed here.** M2 defined the class *names* on
  `RatingCell`; M3 added the actual colour tokens (light + dark) and table
  styling in `index.css`.
- **Added `.claude/launch.json`** so the preview server can be driven by name
  (`dev` → port 5173).

## Workflow

No CLAUDE.md workflow changes. "Current state", Docs TOC, and the
self-improvement log were updated in the same session.
