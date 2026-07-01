# Retrospective 003 — Comparison core (M2)

## What shipped

The pure comparison core on mock data, milestone M2 ([issue #2](https://github.com/anastasiiaclaude/market-investigation/issues/2)), tracing to FR-1:

- `app/src/domain/competitor.ts` — `Rating` and feature-area unions, `FEATURE_AREA_LABELS`, the `Competitor` Zod schema, and `parseCompetitor`.
- `app/src/domain/rating-cell.ts` — pure `ratingToCell` presentation mapping (label / symbol / severity / className).
- `app/src/mocks/competitors.ts` — four illustrative mock competitors rated across all six feature areas.
- Specs: `rating-cell.spec.ts`, `competitor.spec.ts` (10 tests, green). `tsc -b` and eslint clean.
- ADR 006 authorized adding `zod`.

## Decisions

- **Zod adopted (ADR 006).** The user chose to add it now rather than defer; it is the single source of truth for the `Competitor` type (`z.infer`) and will validate LLM output (M5) and DB rows (M6) with the same schema.
- **Feature taxonomy = six broad functional areas** (dashboards, integration, trend analytics, quality analytics, alerting, reporting) rather than VA-INDIGO's four modules — chosen by the user for a more general comparison.
- **Mapping is presentation-only.** Gap-vs-VA-INDIGO logic (FR-4) stays in M3.

## Gotchas (for next time)

- **Zod 4 changed string formats.** Use top-level `z.url()` / `z.email()`; `z.string().url()` is deprecated.
- **Exhaustive feature record.** `z.record(enum, value)` does not reliably require every key; building the schema as an explicit `z.object` from `FEATURE_AREAS` makes a missing area fail validation.
- **`erasableSyntaxOnly` + `verbatimModuleSyntax`.** No TS `enum`s (used `as const` string arrays); type-only imports must use `import type`.
- **eslint has no unused-var underscore escape here.** A `const { x: _x, ...rest }` omit-a-key trick fails lint; use a typed `Partial` copy + `delete` instead.

## Workflow

No workflow change needed. Loop held: ADR → spec → failing tests → minimal code → green → docs. CLAUDE.md updated (Current state, TOC, log).
