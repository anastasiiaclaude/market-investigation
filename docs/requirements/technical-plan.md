# Technical Plan — market-investigation

## Summary

Web dashboard for competitive analysis. Claude searches the web for competitors and saves the data to a JSON file; the React app displays, compares, and lets you manage that data.

## Frontend

- **Stack:** Vite + React + TypeScript (boilerplate default)
- **Main screens / components:**
  - `CompetitorTable` — feature comparison table: competitors in columns, features in rows
  - `CompetitorCard` — competitor card with detailed information
  - `ViewToggle` — switch between table and cards
  - `FeatureMatrix` — feature presence/absence matrix (strong/weak/absent)
  - `CompetitorForm` — form for manually editing / adding a record

## Backend

- **Needed?** No.
- **How it works:** Claude (the agent) runs a web search, builds the data, and writes it to `app/src/data/competitors.json`. The React app imports this file statically. No server is needed — data is updated through the agent, not via a runtime API.

## Integrations

| Service | Purpose | How | Auth |
|---|---|---|---|
| WebSearch (Claude tool) | Finding competitors and their features | Built-in agent tool | Not needed |
| WebFetch (Claude tool) | Reading competitor pages | Built-in agent tool | Not needed |

## Data & storage

- **Format:** `app/src/data/competitors.json` — an array of competitor objects
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
- **Between sessions:** data lives in a file in the repository — Git serves as the change history
- **Editing:** via a UI form (updates state) + Claude rewrites the JSON on a new research run
- **Persistence:** localStorage for UI state (selected view, filters); the real data is in the JSON file

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
- **How we fit the constraints:** static JSON import for the base features; parsing, export, and integrations (Jira/Confluence) require going beyond the static boilerplate — handled via an ADR (see below)

## Conflict with constraints (requires an ADR)

Real-time parsing, export, and Jira/Confluence integrations do not fit a purely static Vite + React boilerplate (no backend). Before Feature 006–009 a decision is needed:

- **Parsing/integrations** — performed by the agent (Claude) via MCP tools (Atlassian connector, WebSearch/WebFetch), not a runtime server. This preserves "no backend" but is recorded in `docs/decisions/NNN-*.md`.
- **PDF/Excel export** — client-side libraries in the browser (e.g., via an ADR for a new dependency).

## Open questions / risks

- The `features` structure in the JSON must be agreed before Feature 002 — the feature set is fixed during the first research run (can be extended via an ADR)
- `competitors.json` will initially be empty or contain mock data for UI development — clarify before Feature 002
