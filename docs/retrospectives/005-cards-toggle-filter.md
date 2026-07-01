# Retrospective 005 — Cards + view toggle + filter/search (M4)

Milestone **M4**, issue #4. Feature doc:
[feature-005-cards-toggle-filter.md](../requirements/feature-005-cards-toggle-filter.md).
Traces to FR-2, FR-3, FR-7. Stayed entirely on mock data — no backend/AI/DB.

## What shipped

- Two pure, node-tested modules: `domain/filter.ts` (`filterCompetitors`,
  `visibleAreas`, `FilterState`) and `domain/view-preference.ts`
  (`parseView`/`loadView`/`saveView`, `View`, storage key + default).
- `buildComparison` gained an optional `areas` subset (backward-compatible,
  defaults to `FEATURE_AREAS`) so the feature filter narrows rows through the
  existing pure model — gap logic stays the single source of truth.
- Components (render-only): `CompetitorCard`, `CompetitorCards` (card-view
  container mirroring `CompetitorTable`), `ViewToggle`, `Toolbar`. New
  `hooks/useViewPreference` glues the pure persistence module to React state.
- `App` became the orchestrator: filter state + persisted view, feeding both
  views the filtered competitors + areas. VA-INDIGO is always pinned; the
  empty-result note renders once (both views).

## What went well

- The M2/M3 pure-logic-first split paid off again: all testable behaviour
  (filtering, view parsing/persistence) landed as node specs (no jsdom), and the
  components stayed thin enough to verify in the browser instead of unit tests.
- Deriving card gap flags from `buildComparison` (rather than re-deriving) kept
  table and cards in exact agreement for free.

## Friction / decisions

- **Port conflict:** another chat held `:5173` and vite pins `strictPort: true`,
  so `preview_start` on dev failed (a CLAUDE.md escalation case). Resolved
  without disturbing the other session by adding a **`preview` config to
  `.claude/launch.json`** (port 4173) and verifying against the production build.
  This is now the go-to for browser verification when `:5173` is occupied.
- **Order responsibility:** `visibleAreas` canonicalises + de-dupes area order;
  `buildComparison` just preserves the order it is handed. Keeping
  canonicalisation in one place avoided sorting twice.
- Confirmed four product decisions up front via the feature-dev flow (search +
  feature filter; VA-INDIGO always pinned; applies to both views; full cards
  with gap flags) — recorded in the feature doc's "Decisions" section.

## Workflow changes

- None to the working agreement. CLAUDE.md "Current state" + Docs TOC + this log
  updated in the same session.
