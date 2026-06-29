# Constraints

## Out of scope (never build)

- Authentication and roles — not needed for a local single-user tool.
- Mobile version — desktop browser only.

## Baseline constraints

- No refactoring outside the current scope.
- No new npm dependencies without an ADR.
- No code without a spec file.
- No skipping the retrospective after a feature.
- Governance files (`CLAUDE.md`, `docs/**`) — at the root only, never in `app/`.
- App code — in `app/` only, never at the root.
- `eslint-plugin-react` is incompatible with ESLint 10 (current Vite version) — do not install it; use `eslint-plugin-react-hooks`.
