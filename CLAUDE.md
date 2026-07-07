# CLAUDE.md — market-investigation

Web dashboard for competitive analysis. Lets you visualize and manage competitor data as part of market research.

## Repository layout

```
market-investigation/        ← repo root (git)
  CLAUDE.md                  ← entry point for Claude
  README.md                  ← entry point for humans
  package.json               ← root pass-through scripts
  .gitignore  .editorconfig  .nvmrc  .env.example
  docs/                      ← requirements / decisions / retros / constraints
  app/                       ← Vite + React + TypeScript frontend code
  api/                       ← Vercel serverless functions (ADR 002 + 003)
```

Governance files (`CLAUDE.md`, `README.md`, `docs/**`) live only at the root. Frontend code lives in `app/`, serverless backend in `api/`. Deploys to Vercel; data in Postgres (Neon) via Drizzle ORM.

## Dev server

```
npm run dev   →   http://127.0.0.1:5173/
```

Port is stored in `.dev-port` (defaults to 5173).

## Common commands (all from repo root)

```
npm run dev        # dev server
npm run build      # production build
npm run preview    # preview build
npm run test       # vitest watch
npm run test:run   # vitest single run
npm run lint       # eslint
npm run format     # prettier
npm run setup      # install app/ deps
```

## Critical files

- `app/vite.config.ts` — port config + path alias `@/`
- `app/vitest.config.ts` — test env; discovers specs in `app/src/**` and `api/**`
- `vercel.json` — Vercel build (SPA from `app/dist`) + `api/` functions
- `api/health.ts` — `GET /api/health`; pure logic in `api/_lib/`
- `docs/constraints.md` — what you must not do

## Current state

Hello world greeting rendered. **M1 done:** Vercel skeleton — static SPA build
(`vercel.json`) + `GET /api/health` serverless function returns `200 {status:"ok"}`.
Backend lives in `api/` (web-standard handlers, pure logic in `api/_lib/`).
**M2 done:** comparison core on mock data — `app/src/domain/` holds the `Competitor`
Zod schema + `Rating`/feature-area enums (`competitor.ts`) and the pure
`ratingToCell` presentation mapping (`rating-cell.ts`); mock dataset in
`app/src/mocks/competitors.ts`. Zod added as a dependency (ADR 006).
**M3 done:** comparison table UI — `domain/gap.ts` (`isGap`, `buildComparison`,
pure + tested) flags VA-INDIGO cells that are weak/absent while a competitor is
stronger (FR-4); `components/CompetitorTable.tsx` renders the matrix with
VA-INDIGO (a separate `VA_INDIGO` mock record) pinned as a highlighted first
column; `App.tsx` is now the dashboard. `.rating-*` colours + table styling in
`index.css`; `.claude/launch.json` added for the preview server.
**M4 done:** cards + view toggle + filter/search (FR-2, FR-3, FR-7). Pure modules
`domain/filter.ts` (`filterCompetitors`, `visibleAreas`) + `domain/view-preference.ts`
(`parseView`/`loadView`/`saveView`, persisted to localStorage), both node-tested.
`buildComparison` gained an optional `areas` subset so the feature filter narrows
rows through the same model. Components: `CompetitorCard`, `CompetitorCards`,
`ViewToggle`, `Toolbar`; `hooks/useViewPreference` wires persistence to React.
`App.tsx` orchestrates filter state + view; VA-INDIGO always pinned. Added a
`preview` config (port 4173) to `.claude/launch.json` for browser verification
when `:5173` is taken.
**M5 done:** research endpoint `POST /api/research` (FR-8, FR-9). Fetches a
competitor URL, extracts clean text (dependency-free pure `api/_lib/extract.ts`,
ADR 005), summarizes + rates it via OpenRouter (`api/_lib/openrouter.ts` thin
fetch wrapper + pure `api/_lib/summarize.ts`, ADR 004), returns a schema-valid
`Competitor` (unpersisted). Orchestration in `api/_lib/research.ts`; thin handler
in `api/research.ts`. Model-output validation + `toCompetitor` live in
`app/src/domain/research.ts` so **all Zod stays in `app/src`** (backend imports it
transitively; `api/` stays dependency-free). Guardrails: 400/500/502; live-model
check is deploy-time (`api/*` isn't served by vite dev). Added `api/env.d.ts`
(ambient `process`) since `api/` reads `process.env` without `@types/node`.
SSRF guard (pure `api/_lib/url-guard.ts`, issue #15): the handler rejects
loopback/link-local/private/metadata hosts with `400` before any fetch. Residual
(tracked in #15): no DNS resolution or redirect re-check yet.
**M6 Part A done (backend, issue #6):** Postgres (Neon) + Drizzle persistence +
dedup (FR-10, FR-11). `api/` is now its own sub-package (`api/package.json`;
`drizzle-orm` + `@neondatabase/serverless` — the non-deprecated Neon driver
replacing `@vercel/postgres`; ADR 007). URL-based identity: `websiteKey` (pure
`app/src/domain/identity.ts`) is the DB primary key = research dedup key = REST
id; `toCompetitor` now sets `id = websiteKey(url)` (was a name slug). DB access
is behind a `CompetitorRepo` seam (`api/_lib/db/`): `drizzleRepo` (live,
deploy-verified) + `inMemoryRepo` (node tests). `POST /api/research` upserts by
URL id, so re-runs never duplicate. CRUD via `/api/competitors` (by-id ops use
`?id=` since URL-key ids contain slashes). Migration in `api/drizzle/`
(`drizzle-kit generate/migrate`); idempotent seed (`_scripts/seed.ts`,
`npm --prefix api run db:seed`) loads mock rivals re-keyed by URL. `.vercelignore`
+ `installCommand` updated so Vercel installs `api/` deps and skips tooling.
**M6 Part B done (frontend read-path, issue #6):** `App.tsx` now loads
competitors from `GET /api/competitors` instead of the mock. Pure
`app/src/domain/competitors-api.ts` (`fetchCompetitors`, validates rows via
`competitorSchema`, node-tested with injected fetch) + thin `useCompetitors`
hook (untested glue, like `useViewPreference`). On any fetch failure the hook
falls back to `MOCK_COMPETITORS` + a "sample data" banner (so vite-only dev,
where `/api` is unserved, still renders); a valid empty response shows a distinct
empty-DB note. VA-INDIGO stays client-pinned. Seed script fixed to run under
native Node TS (self-contained; PR #19). **M6 complete** (live DB path
deploy-verified against Neon).

## Working agreement

1. No code without a spec. Every feature begins as a file under `docs/requirements/` and a failing test — `app/src/**/*.spec.ts(x)` for frontend logic, `api/**/*.spec.ts` for backend logic.
2. No architectural choice without an ADR under `docs/decisions/`.
3. Read `docs/constraints.md` before proposing anything new. Surface conflicts, don't silently comply.
4. The loop is: spec → failing test → minimal code → green test → commit. One concern per commit.
5. Logic in pure modules, rendering in components. Specs target the logic.
6. When in doubt, ask. Use AskUserQuestion rather than guessing requirements.
7. Keep `CLAUDE.md`'s "Current state" section updated after every merged change.
8. Dev server lives at `http://127.0.0.1:5173/` (read port from `.dev-port`). `strictPort: true` is set.
9. **Retrospective after every feature.** Write `docs/retrospectives/NNN-<slug>.md`. Edit `CLAUDE.md` in same session if workflow changes.
10. **Layout discipline.** Governance at root, app code inside `app/`.
11. **Conventional Commits.** `<type>(<scope>): <subject>`.
12. **CLAUDE.md ≤ ~200 lines.** Router, not encyclopedia.

## Escalation rules

Stop and ask via AskUserQuestion when:
- The same test has failed 3 times with different fixes.
- A request conflicts with `docs/constraints.md` or Rules below.
- A new runtime dependency is needed (ask + ADR before installing).
- `:5173` or `:4173` is taken.
- This change would push `CLAUDE.md` past ~200 lines.
- Acceptance criteria in a requirements doc are ambiguous.

## Rules

**TypeScript strict:** Do NOT disable `strict`, `noImplicitAny`, `strictNullChecks`, or `noUncheckedIndexedAccess` in any `tsconfig*.json`.

**Pure modules:** Business logic lives in pure modules under `app/src/`. React components only render.

**Spec first:** Every new module starts with a failing `*.spec.ts(x)` test.

## Docs TOC

- [PRD](docs/PRD.md)
- [Roadmap (milestones M0–M8)](docs/ROADMAP.md)
- [Requirements overview](docs/requirements/overview.md)
- [Technical plan](docs/requirements/technical-plan.md)
- [Feature 001 — Hello World](docs/requirements/feature-001-hello-world.md)
- [Feature 002 — Vercel skeleton (M1)](docs/requirements/feature-002-vercel-skeleton.md)
- [Feature 003 — Comparison core (M2)](docs/requirements/feature-003-comparison-core.md)
- [Feature 004 — Comparison table + gap highlighting (M3)](docs/requirements/feature-004-comparison-table.md)
- [Feature 005 — Cards + view toggle + filter/search (M4)](docs/requirements/feature-005-cards-toggle-filter.md)
- [Feature 006 — Research endpoint: extraction + summarization (M5)](docs/requirements/feature-006-research-endpoint.md)
- [Feature 007 — Persistence + dedup (M6)](docs/requirements/feature-007-persistence.md)
- [ADR 001 — Agent structure](docs/decisions/001-agent-structure.md)
- [ADR 002 — Add backend](docs/decisions/002-add-backend.md)
- [ADR 003 — Vercel serverless + Postgres (Neon)](docs/decisions/003-deploy-vercel-serverless.md)
- [ADR 004 — OpenRouter summarization](docs/decisions/004-openrouter-summarization.md)
- [ADR 005 — Competitor extraction](docs/decisions/005-competitor-extraction.md)
- [ADR 006 — Zod validation](docs/decisions/006-zod-validation.md)
- [ADR 007 — `api/` sub-package; Drizzle + Neon; URL identity](docs/decisions/007-api-subpackage-drizzle.md)
- [Constraints](docs/constraints.md)
- Retrospectives: _(see Self-improvement log below)_

## Self-improvement log

- [001-hello-world](docs/retrospectives/001-hello-world.md) — bootstrap retrospective; recorded the nc workaround on Windows and the eslint-plugin-react limitation.
- [002-vercel-skeleton](docs/retrospectives/002-vercel-skeleton.md) — M1; web-standard `api/` handlers (no `@vercel/node` dep), vitest root moved to repo root, fixed deprecated `baseUrl` build break.
- [003-comparison-core](docs/retrospectives/003-comparison-core.md) — M2; Zod 4 top-level formats (`z.url()`), exhaustive feature-record via explicit `z.object`, `erasableSyntaxOnly` rules out enums (used `as const` unions).
- [004-comparison-table](docs/retrospectives/004-comparison-table.md) — M3; relative gap rule (weak/absent AND a competitor stronger), VA-INDIGO as a separate `VA_INDIGO` mock (no `isHome` flag), pure `gap.ts` keeps node-only tests (no jsdom dep), real `.rating-*` CSS + `.claude/launch.json`.
- [005-cards-toggle-filter](docs/retrospectives/005-cards-toggle-filter.md) — M4; pure `filter.ts` + `view-preference.ts` (node-tested, no jsdom), `buildComparison` optional `areas` subset, card gaps derived from the same model, `preview` launch config (4173) as the `:5173`-taken workaround.
- [006-research-endpoint](docs/retrospectives/006-research-endpoint.md) — M5; `POST /api/research` (fetch→extract→OpenRouter→`Competitor`), all Zod kept in `app/src` so `api/` stays dependency-free + Vercel/vitest both resolve it, dependency-free `extract`, injectable `fetchImpl` for node-only tests, ambient `api/env.d.ts` for `process.env`, live check is deploy-time.
- [007-persistence](docs/retrospectives/007-persistence.md) — M6; `api/` became a sub-package for DB libs (Zod-via-`app/src` trick can't carry a pg driver), swapped deprecated `@vercel/postgres`→`@neondatabase/serverless` (ADR 007), URL-based `websiteKey` identity = PK = dedup key = REST id, `CompetitorRepo` seam (drizzle + in-memory) keeps tests DB-free, `?id=` route since URL ids contain slashes, `updated_at` as `text` to preserve ISO round-trip. Part B: `App.tsx` reads `GET /api/competitors` via pure `competitors-api` + thin `useCompetitors`, mock-fallback+banner on any fetch throw (vite dev serves `index.html` for `/api`, so fallback fires on JSON-parse not status). Seed was never actually run until now — crashed on extensionless imports under native Node TS, fixed self-contained (PR #19).
