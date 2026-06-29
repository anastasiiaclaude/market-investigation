# ADR 001 — Repository Structure: Root vs app/

## Context

We need to separate the governance layer (documentation, agent configuration) from the application code, so Claude does not confuse them or create code at the repo root.

## Decision

- `CLAUDE.md`, `README.md`, `docs/**` — at the repo root only.
- All Vite + React + TypeScript code — in `app/` only.
- Root `package.json` holds pass-through scripts (`npm --prefix app run ...`).
- A single `.gitignore` lives at the root. `app/.gitignore` was removed.

## Consequences

- Claude always reads `CLAUDE.md` at the root and knows the structure.
- `app/` can be swapped for another framework without changing governance.
- Root-level CI configs (.github/, etc.) are allowed; app code at the root is not.
