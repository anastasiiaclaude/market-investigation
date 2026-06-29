# Retrospective 002 — Vercel skeleton + health endpoint (M1)

## What we did

Stood up the Vercel deploy skeleton for [issue #1](https://github.com/anastasiiaclaude/market-investigation/issues/1):
added `vercel.json` (install + build `app/`, serve `app/dist`), created the first
serverless function `api/health.ts` (`GET /api/health` → `200 {status:"ok"}`),
and kept the response shape in a pure module `api/_lib/health.ts` per the
"logic in pure modules" rule. Ran the spec-first cycle (red → green) with specs
in `api/`. Governed by ADR 002 + ADR 003; no new ADR needed.

## What worked

- **Web-standard `Request`/`Response` handler signature** (`export function GET()`)
  means the M1 function needs **no extra runtime dependency** — no `@vercel/node`,
  no install into a backend `node_modules`. Trivially unit-testable too.
- Vercel's `_`-prefix convention (`api/_lib/`) keeps the pure helper out of the
  route table while colocating it with the function it serves.
- Spec-first held up for backend code once vitest could see `api/`.

## What didn't / friction points

- **Vitest only scanned `app/`.** Backend pure modules live in `api/` (root), so
  the spec wasn't discovered. Fixed by setting vitest `root` to the repo root and
  an explicit `include` for `app/src/**` and `api/**`. (Recorded in CLAUDE.md.)
- **Pre-existing build break:** `tsconfig.app.json` used `baseUrl`, which TS 6
  now treats as a deprecation *error*, so `tsc -b && vite build` failed — the
  Vercel deploy would have failed before any M1 code ran. Removed `baseUrl`;
  `paths` still resolves relative to the tsconfig. Surfaced rather than worked
  around silently (CLAUDE.md rule 3).
- **`api/` has no `node_modules` at root**, so a standalone `tsc -p api` can't
  resolve `vitest` types and raw `node` can't resolve extensionless TS imports.
  Handled by excluding `**/*.spec.ts` from `api/tsconfig.json` (specs run under
  vitest, which resolves them) and verifying the handler through vitest, not raw
  node. Vercel bundles `api/` itself, so this is local-tooling-only.

## Decisions to carry forward

- [ADR 002 — Add backend](../decisions/002-add-backend.md) ·
  [ADR 003 — Vercel serverless + Postgres](../decisions/003-deploy-vercel-serverless.md)
- Prefer web-standard `Request`/`Response` handlers in `api/` to avoid extra deps
  until a function genuinely needs them.

## Changes made to CLAUDE.md / constraints / working agreement

- "Current state" → M1 done.
- Critical files: added `vercel.json`, `api/health.ts`; noted vitest now discovers
  `api/**` specs.
- Working agreement rule 1: backend specs live under `api/**/*.spec.ts`.
- Docs TOC: added Feature 002.

## Open questions for next session

- M2 builds the pure data model + comparison logic on mock data (FR-1). Confirm
  the mock competitor shape before writing the Zod schema.
