# Retrospective 001 — Hello World Bootstrap

## What we did

Created the repo structure with governance at the root and code in `app/`, installed Vite + React + TS, set up vitest/eslint/prettier, ran the spec-first cycle for the hello world greeting, and started the dev server.

## What worked

- Vite already ships an eslint.config.js with flat config and the needed plugins — minimal extra setup.
- The spec-first cycle: red test → module → green test — works cleanly.
- Root pass-through scripts via `--prefix app` are convenient; no npm workspaces needed.

## What didn't / friction points

- `nc` (netcat) is missing on Windows — replaced the port probe with a PowerShell `TcpClient`. This needs to be kept in mind for future scripts.
- `eslint-plugin-react` is incompatible with ESLint 10 (Vite 8 pulls in ESLint 10) — not installed; we use `eslint-plugin-react-hooks`. Recorded in `docs/constraints.md`.
- `.claude/launch.json` is not created via Claude (classifier limitation) — must be created manually when needed.

## Decisions to carry forward

- [ADR 001 — Agent structure](../decisions/001-agent-structure.md)

## Changes made to CLAUDE.md / constraints / working agreement

- Added the `eslint-plugin-react` constraint to `docs/constraints.md`.

## Open questions for next session

- Which first business feature of the dashboard do we build?
