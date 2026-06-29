# Technical Plan — market-investigation

## Summary

Web dashboard for competitive analysis. A Node + Express backend with a SQLite store holds competitor data, runs research jobs, and handles export and Jira/Confluence integration; the React app displays, compares, and lets you manage that data over a REST API.

## Frontend

- **Stack:** Vite + React + TypeScript (boilerplate default)
- **Main screens / components:**
  - `CompetitorTable` — feature comparison table: competitors in columns, features in rows
  - `CompetitorCard` — competitor card with detailed information
  - `ViewToggle` — switch between table and cards
  - `FeatureMatrix` — feature presence/absence matrix (strong/weak/absent)
  - `CompetitorForm` — form for manually editing / adding a record

## Backend

- **Needed?** Yes — see [ADR 002](../decisions/002-add-backend.md).
- **Stack:** Node + Express + TypeScript in a `server/` folder (sibling to `app/`).
- **Responsibilities:**
  - REST API serving competitor data to the frontend
  - Persistence in SQLite
  - Research jobs (scheduled or on-demand) that fetch competitor data via WebSearch/WebFetch and write to the DB
  - PDF/Excel export generation
  - Jira/Confluence integration with credentials stored in `.env`
- **How data flows:** the React app calls the backend over HTTP; the backend reads/writes SQLite. `competitors.json` becomes seed data for the initial DB.

## Integrations

| Service | Purpose | How | Auth |
|---|---|---|---|
| WebSearch (Claude tool) | Finding competitors and their features | Built-in agent tool | Not needed |
| WebFetch (Claude tool) | Reading competitor pages | Built-in agent tool | Not needed |
| Jira | Create issues from feature gaps | Backend via Atlassian REST API | API token in `.env` |
| Confluence | Publish comparison as a page | Backend via Atlassian REST API | API token in `.env` |

## Data & storage

- **Store:** SQLite database managed by the backend (`server/`).
- **Seed:** `competitors.json` provides initial data loaded into the DB on first run.
- **Record schema:**
  ```ts
  interface Competitor {
    id: string;
    name: string;
    website: string;
    description: string;
    features: Record<string, 'strong' | 'adequate' | 'weak' | 'absent'>;
    updatedAt: string;
  }
  ```
- **Between sessions:** data persists in the SQLite file.
- **Editing:** via a UI form that calls the backend API; research jobs also update the DB.
- **UI state:** localStorage for view/filter preferences (frontend only).

## MVP scope (features to build)

- **Feature 002 (first):** Load and display `competitors.json` as a feature comparison table — `CompetitorTable` with the strong/adequate/weak/absent matrix
- **Then:**
  - Feature 003: Competitor cards (`CompetitorCard`) + view toggle
  - Feature 004: Form for manually editing/adding a competitor (updates the JSON via the agent)
  - Feature 005: Filtering and search across the table
  - Feature 006: Real-time automatic parsing — the agent updates `competitors.json` on request or on a schedule
  - Feature 007: Export to PDF/Excel — export the comparison table and cards
  - Feature 008: Jira integration — create issues based on identified feature gaps
  - Feature 009: Confluence integration — publish the comparison table as a page
- **Architecture:** the backend ([ADR 002](../decisions/002-add-backend.md)) handles parsing jobs, export, and Jira/Confluence server-side; the frontend consumes the REST API. Feature 002 may start against `competitors.json` seed data and switch to the API as the backend lands.

## Open questions / risks

- The `features` structure in the JSON must be agreed before Feature 002 — the feature set is fixed during the first research run (can be extended via an ADR)
- `competitors.json` will initially be empty or contain mock data for UI development — clarify before Feature 002
