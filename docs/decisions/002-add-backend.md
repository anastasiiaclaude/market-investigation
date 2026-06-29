# ADR 002 — Introduce a Backend

## Context

The original design (see [ADR 001](001-agent-structure.md) and `docs/constraints.md`) was a pure static Vite + React app: competitor data lived in a JSON file written by the agent, with no server or database.

The MVP scope now includes real-time parsing, PDF/Excel export, and Jira/Confluence integration. These need a place to store API keys safely, run scheduled jobs, and persist data reliably — none of which a static frontend can do. The product owner has asked for a backend.

## Decision

Add a backend service to the project.

- **Stack:** Node + Express in TypeScript, in a new `server/` folder at the repo root (sibling to `app/`). Chosen to share the TypeScript ecosystem and types with the frontend and keep one toolchain.
- **Role:** full — persist competitor data, run scheduled/real-time research jobs, and handle Jira/Confluence integration and PDF/Excel export server-side with secured credentials.
- **Data store:** SQLite (file-based, zero infrastructure, fits a single local user). Revisable to PostgreSQL if the project grows.
- **API:** REST; the React app talks to the backend over HTTP instead of importing a static JSON file.

These stack/store choices are sensible defaults for a single local user and can be revised via a follow-up ADR without re-litigating the decision to have a backend.

## Consequences

- This supersedes the "no backend / no server / no database" baseline constraint in `docs/constraints.md`. That constraint is removed.
- Repo layout gains a `server/` folder. Layout discipline still holds: governance at root, frontend in `app/`, backend in `server/`.
- Secrets (Jira/Confluence tokens, etc.) live in `.env` (gitignored); `.env.example` documents the variables.
- New runtime dependencies (Express, a SQLite driver) are now expected; they no longer each need a separate ADR, but stay listed in this decision's scope.
- `competitors.json` becomes seed/migration data rather than the source of truth.
