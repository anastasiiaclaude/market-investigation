# ADR 003 — Deploy to Vercel with Serverless Functions + Turso

## Context

[ADR 002](002-add-backend.md) added a backend as a long-running Node + Express server with a local SQLite file. The target hosting is now Vercel (chosen over GitHub Pages, which is static-only and cannot run the parsing/export/integration features at runtime).

Vercel does not run a persistent Express server, and its function filesystem is ephemeral and read-only at runtime — a local SQLite file would not persist. So the ADR 002 implementation shape does not deploy as-is, even though the *decision to have a backend* still stands.

## Decision

Build the backend as **Vercel Serverless Functions** and use a **hosted, serverless-friendly database**.

- **Hosting:** Vercel. The Vite + React frontend is built as a static SPA; backend logic runs as serverless functions under an `api/` directory.
- **Backend runtime:** TypeScript serverless functions (Vercel Functions), not a standalone Express server. Each API route is a function handler.
- **Database:** Turso (libSQL) via `@libsql/client`. libSQL is SQLite-compatible, so the data model from ADR 002 carries over; it works from serverless functions over the network and has a free tier suitable for a single user.
- **Secrets:** Jira/Confluence tokens and the Turso connection string live in Vercel environment variables (mirrored locally in `.env`, gitignored; documented in `.env.example`).
- **Scheduled parsing:** Vercel Cron Jobs trigger a serverless function for periodic research; on-demand parsing is a normal API call.

## Consequences

- **Supersedes the implementation details of ADR 002** (Express + local SQLite). The *backend exists* decision from ADR 002 remains; only its shape changes to serverless + Turso. ADR 002's local-SQLite/Express specifics no longer apply.
- Repo layout: backend code lives in `api/` (Vercel convention) rather than `server/`. Layout discipline holds: governance at root, frontend in `app/`, serverless functions in `api/`.
- A `vercel.json` configures the build (frontend from `app/`) and functions.
- New dependencies: `@libsql/client`, `@vercel/node` types. Covered by this ADR.
- Long-running/stateful work is out — anything that needs persistence must go through Turso, not local files.
- GitHub Pages is explicitly rejected: it cannot run the runtime backend the MVP needs.
