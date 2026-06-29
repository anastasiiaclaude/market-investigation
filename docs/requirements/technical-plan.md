# Technical Plan — market-investigation

## Summary

Web dashboard for competitive analysis, deployed on **Vercel**. A static Vite + React frontend talks to **serverless functions** (`api/`) backed by **Vercel Postgres (Neon) + Drizzle ORM**; the backend holds competitor data, runs research jobs, and handles export and Jira/Confluence integration. See [ADR 003](../decisions/003-deploy-vercel-serverless.md). Milestone breakdown in [ROADMAP.md](../ROADMAP.md).

## Frontend

- **Stack:** Vite + React + TypeScript (boilerplate default)
- **Main screens / components:**
  - `CompetitorTable` — feature comparison table: competitors in columns, features in rows
  - `CompetitorCard` — competitor card with detailed information
  - `ViewToggle` — switch between table and cards
  - `FeatureMatrix` — feature presence/absence matrix (strong/weak/absent)
  - `CompetitorForm` — form for manually editing / adding a record

## Backend

- **Needed?** Yes — [ADR 002](../decisions/002-add-backend.md) (have a backend), [ADR 003](../decisions/003-deploy-vercel-serverless.md) (serverless shape).
- **Stack:** TypeScript **Vercel Serverless Functions** in an `api/` folder. No standalone server.
- **Responsibilities:**
  - REST API serving competitor data to the frontend (`GET/POST/PUT /api/competitors`)
  - Persistence in Vercel Postgres (Neon) via Drizzle ORM
  - Research jobs (on-demand `POST /api/research` + Vercel Cron) that fetch competitor pages, summarize them via OpenRouter, and upsert to the DB
  - PDF/Excel export generation (`GET /api/export`)
  - Jira/Confluence integration with credentials in Vercel env vars
- **How data flows:** the React app calls the functions over HTTP; the functions read/write Postgres via Drizzle. `competitors.json` is the seed loaded into the DB on setup.

## Integrations

| Service | Purpose | How | Auth |
|---|---|---|---|
| WebSearch (Claude tool) | Finding competitors and their features | Built-in agent tool | Not needed |
| WebFetch (Claude tool) | Reading competitor pages | Built-in agent tool | Not needed |
| OpenRouter | Summarize pages → summary + ratings (runtime, server-side) | Backend via OpenAI-compatible REST | `OPENROUTER_API_KEY` |
| Jira | Create issues from feature gaps | Backend via Atlassian REST API | API token in `.env` |
| Confluence | Publish comparison as a page | Backend via Atlassian REST API | API token in `.env` |

## Data & storage

- **Store:** Vercel Postgres (Neon) via Drizzle ORM — hosted, serverless-friendly, type-safe schema/queries.
- **Seed:** `competitors.json` provides initial data loaded into the DB via a setup/migration script.
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
- **Between sessions:** data persists in Postgres (Neon).
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
- **Architecture:** serverless functions ([ADR 003](../decisions/003-deploy-vercel-serverless.md)) handle parsing jobs, export, and Jira/Confluence; the frontend consumes the REST API. Feature 002 may start against `competitors.json` seed data and switch to the API as the functions land.
- **Detailed milestone breakdown:** see [ROADMAP.md](../ROADMAP.md).

## Open questions / risks

- The `features` structure in the JSON must be agreed before Feature 002 — the feature set is fixed during the first research run (can be extended via an ADR)
- `competitors.json` will initially be empty or contain mock data for UI development — clarify before Feature 002
