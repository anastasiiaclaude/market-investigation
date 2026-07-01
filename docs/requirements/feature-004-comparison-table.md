# Feature 004 — Comparison table render + gap highlighting

Milestone **M3**. Render the comparison table from mock data and visibly flag
VA-INDIGO's competitive gaps. Builds on M2 (feature 003). Stays entirely on
mock data — no backend, no AI, no DB. Traces to **FR-1** (display all
competitors in a comparison table; competitors as columns, features as rows)
and **FR-4** (highlight gaps where VA-INDIGO is weak or absent vs. competitors).

## User story

As the product manager, I want to see every competitor's feature ratings in a
single comparison table with VA-INDIGO pinned as the home product, and to have
VA-INDIGO's competitive gaps highlighted at a glance, so I can spot where our
suite is behind the market.

## Definitions

- **Home product** — VA-INDIGO, the VON ARDENNE analysis suite the comparison
  is centred on. Modelled as a `Competitor` record, kept separate from the
  rival list.
- **Gap** — for a feature area, VA-INDIGO is rated `weak` or `absent` **and**
  at least one competitor rates strictly higher in that area (by `severity`).
  A self-weakness where every competitor is equally weak is *not* a gap.

## Acceptance criteria

- GIVEN VA-INDIGO is `weak`/`absent` in an area AND a competitor rates strictly
  higher there
  WHEN the comparison model is built
  THEN that VA-INDIGO cell is marked as a gap.
- GIVEN VA-INDIGO is `weak`/`absent` in an area but no competitor rates higher
  WHEN the comparison model is built
  THEN that cell is NOT a gap.
- GIVEN VA-INDIGO is `strong` or `adequate` in an area
  WHEN the comparison model is built
  THEN that cell is never a gap, regardless of competitors.
- GIVEN a home product and a list of competitors
  WHEN the comparison model is built
  THEN it has one row per feature area (in `FEATURE_AREAS` order), each row
  carrying the home cell (with its gap flag) and the competitor cells aligned
  to the input competitor order.
- GIVEN the mock dataset
  WHEN the table renders
  THEN VA-INDIGO appears as the first, visually distinguished column, followed
  by every competitor, and every gap cell is visibly flagged.

## Out of scope

- Card view and table/card toggle (M4, FR-2/FR-3).
- Filter and search (M4, FR-7).
- Persistence, research, AI summarization (M5+).
- Editing competitor data (M7).

## Open questions

- None.
