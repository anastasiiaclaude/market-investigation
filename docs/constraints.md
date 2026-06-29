# Constraints

## Out of scope (never build)

- Authentication and roles — not needed for a local single-user tool.
- Mobile version — desktop browser only.

## Architecture

- The project has a **backend** per [ADR 002](decisions/002-add-backend.md), built as **Vercel serverless functions** in `api/` with a **Turso (libSQL)** database per [ADR 003](decisions/003-deploy-vercel-serverless.md). The earlier "no backend / no server / no database" baseline no longer applies.
- **Deploy target is Vercel.** No standalone long-running server, no local-file persistence at runtime (functions are stateless; all state goes to Turso). GitHub Pages is rejected — it cannot run the runtime backend.

## Baseline constraints

- No refactoring outside the current scope.
- No new npm dependencies without an ADR (except those covered by ADR 002 for the backend).
- No code without a spec file.
- No skipping the retrospective after a feature.
- Governance files (`CLAUDE.md`, `docs/**`) — at the root only, never in `app/`.
- App code — in `app/` only, never at the root.
- `eslint-plugin-react` is incompatible with ESLint 10 (current Vite version) — do not install it; use `eslint-plugin-react-hooks`.
