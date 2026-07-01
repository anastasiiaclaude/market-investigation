# Feature 005 — Cards + view toggle + filter/search

Milestone **M4**. Add a card view of competitors, a persisted table/card view
toggle, and filter/search that narrows both views. Builds on M3 (feature 004).
Stays entirely on mock data — no backend, no AI, no DB. Traces to **FR-2**
(inspect a single competitor in a card view), **FR-3** (toggle between table and
card views; persist the choice in localStorage) and **FR-7** (filter and search
by competitor or feature).

## User story

As the product manager, I want to switch between the comparison table and a set
of per-competitor cards, have my choice remembered, and narrow what I see by
typing a competitor name or picking feature areas, so I can focus on the
competitors and features that matter right now.

## Definitions

- **View** — one of `'table' | 'cards'`. The comparison table (feature 004) or a
  grid of competitor cards. Default is `'table'`.
- **Card** — a panel for one competitor: name, website link, description, and its
  per-feature ratings (reusing the M2/M3 rating symbols). The VA-INDIGO card is
  visually distinguished and shows the same gap flags as the table.
- **Query** — free text matched case-insensitively against a competitor's `name`
  or `description`. An empty/whitespace query matches everyone.
- **Feature-area filter** — a subset of `FEATURE_AREAS`. Empty selection means
  "all areas". Narrows which feature rows (table) / rating lines (cards) show.

## Decisions (resolved 2026-07-01)

- Controls exposed: **both** a text search and a feature-area filter.
- **VA-INDIGO is always pinned/visible** regardless of the query — only
  competitors are filtered out. (The feature-area filter still narrows its rows.)
- The filter/search applies to **both** the table and the card view.
- Cards are **full**: ratings + gap flags on the VA-INDIGO card.

## Acceptance criteria

- GIVEN a query WHEN it is non-empty THEN only competitors whose name or
  description contains the query (case-insensitive) remain; an empty/whitespace
  query keeps all competitors. VA-INDIGO is never filtered by the query.
- GIVEN a feature-area selection WHEN it is non-empty THEN only those areas show,
  in canonical `FEATURE_AREAS` order; an empty selection shows all areas. This
  applies to both the table rows and the card rating lines.
- GIVEN a view choice WHEN the toggle is used THEN the view switches and the
  choice is written to localStorage; on reload the persisted view is restored.
- GIVEN an unset or invalid persisted value WHEN the app loads THEN it falls back
  to the default view (`'table'`).
- GIVEN the card view WHEN it renders THEN VA-INDIGO appears first, visually
  distinguished, with its gap flags, followed by one card per (filtered)
  competitor; each card lists the (filtered) feature areas with rating symbols.
- GIVEN a query that matches no competitors WHEN either view renders THEN
  VA-INDIGO still shows and an empty-result note is presented.

## Out of scope

- Persistence, research, AI summarization (M5+).
- Editing competitor data (M7).
- Sorting competitors; fuzzy/typo-tolerant search (plain substring only).

## Open questions

- None.
