# Constraints

## Out of scope (never build)

- Authentication and roles — not needed for a local single-user tool.
- Mobile version — desktop browser only.

## Architecture

- The project has a **backend** (Node + Express + SQLite in `server/`) per [ADR 002](decisions/002-add-backend.md). The earlier "no backend / no server / no database" baseline no longer applies.

## Baseline constraints

- No refactoring outside the current scope.
- No new npm dependencies without an ADR (except those covered by ADR 002 for the backend).
- No code without a spec file.
- No skipping the retrospective after a feature.
- Governance files (`CLAUDE.md`, `docs/**`) — at the root only, never in `app/`.
- App code — in `app/` only, never at the root.
- `eslint-plugin-react` is incompatible with ESLint 10 (current Vite version) — do not install it; use `eslint-plugin-react-hooks`.
