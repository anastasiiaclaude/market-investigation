# Feature 003 — Comparison core (data model + rating→cell mapping)

Milestone **M2**. Pure data model and comparison logic on mock data — no backend, no AI, no DB. Traces to **FR-1** (display all competitors in a comparison table; strong / adequate / weak / absent).

## User story

As the product manager, I want a well-defined competitor data model and a pure mapping from a feature rating to its table-cell representation, so the comparison table (M3) can be built on a validated, tested foundation.

## Feature areas (matrix rows)

The comparison compares competitors across six broad functional areas of an industrial production-monitoring platform:

| key | Label |
|---|---|
| `realtime-dashboards` | Real-time KPI dashboards |
| `data-integration` | Machine & data-source integration |
| `trend-analytics` | Trend analysis & data export |
| `quality-analytics` | Process & quality analytics |
| `alerting` | Alerting & notifications |
| `reporting` | Reporting & export |

The set is fixed here and may be extended later via an ADR.

## Acceptance criteria

- GIVEN a valid mock competitor
  WHEN passed to `parseCompetitor`
  THEN it is returned unchanged and typed as `Competitor`.
- GIVEN a competitor with an invalid rating value, a non-URL `website`, or a missing feature area
  WHEN passed to `parseCompetitor`
  THEN validation throws.
- GIVEN any rating (`strong` / `adequate` / `weak` / `absent`)
  WHEN passed to `ratingToCell`
  THEN it returns a cell descriptor with the correct `label`, `symbol`, `className`, and a `severity` that strictly orders strong > adequate > weak > absent.
- GIVEN the mock competitor dataset
  WHEN validated
  THEN every record passes `parseCompetitor` and is rated across all six feature areas.

## Out of scope

- Rendering the table or cards (M3/M4).
- Gap-vs-VA-INDIGO highlighting (M3, FR-4).
- Persistence, research, and AI summarization (M5+).

## Open questions

- None.
