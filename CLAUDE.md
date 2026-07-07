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

**M1–M8 slice 1 shipped.** The dashboard loads competitors from the DB, compares
them against VA-INDIGO in a table/card view with filter/search, flags gaps
(FR-4), supports add/edit + on-demand URL research, and fails gracefully. This is
a snapshot — per-milestone detail lives in the retrospectives (see the
Self-improvement log) and git history, not here.

**Shape**

- **Frontend** (`app/src`): pure logic in `domain/` (tested), rendering in
  `components/`, React glue in `hooks/` (untested by design). `App.tsx` is the
  dashboard.
- **Backend** (`api/`): web-standard handlers, pure logic in `api/_lib/`.
  `POST /api/research` (fetch → `extract` → OpenRouter → `Competitor`), CRUD
  `/api/competitors` (by-id ops use `?id=` — URL-key ids contain slashes),
  `GET /api/health`.
- **DB**: Postgres (Neon) + Drizzle behind a `CompetitorRepo` seam — `drizzleRepo`
  (live) + `inMemoryRepo` (tests). `api/` is its own sub-package (`api/package.json`)
  for the DB driver; migrations + idempotent seed in `api/drizzle/` + `_scripts/`.

**Load-bearing invariants**

- **All Zod lives in `app/src`.** The backend imports schemas transitively so
  `api/` stays dependency-free (except its DB sub-package) and both vitest + the
  Vercel bundler resolve `zod` from `app/node_modules`.
- **URL identity.** `websiteKey(url)` (`domain/identity.ts`) is the DB primary key
  = research dedup key = REST id; set on every `toCompetitor`. Website is
  immutable on edit.
- **`api/*` isn't served by vite dev.** Research + CRUD round-trips are
  deploy-verified on Vercel (needs `OPENROUTER_API_KEY` + DB). Vite-only dev falls
  back to `MOCK_COMPETITORS` + a "sample data" banner; a real server error shows
  an error + Retry instead (FR-16, via typed `domain/api-error.ts` `ApiError`).

**Open**

- M8 remaining slices: export (FR-13), Jira (FR-14), Confluence (FR-15), Cron
  (FR-12) — each its own feature/spec/retro.
- SSRF residual (#15): the research handler blocks private/metadata hosts, but no
  DNS resolution or redirect re-check yet.
- **`type="url"` without `noValidate`** in the M7 form has a latent
  native-validation-preempts-custom issue (see retro 009).

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
- [Feature 008 — Add/edit competitor form (M7)](docs/requirements/feature-008-competitor-form.md)
- [Feature 009 — Robustness: graceful errors, invalid URL, rate limits (M8)](docs/requirements/feature-009-robustness.md)
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
- [008-competitor-form](docs/retrospectives/008-competitor-form.md) — M7; add/edit `<dialog>` form over the M6 CRUD API, pure `competitor-form.ts` (values/validation + `toCompetitor`), write-path `createCompetitor`/`updateCompetitor` mirroring the read client, `useCompetitors` gains `upsert` (merge-not-refetch), website read-only on edit (immutable `websiteKey` id), first real `.btn` styles, writes deploy-verified (vite-only dev 404s on save).
- [009-robustness](docs/retrospectives/009-robustness.md) — M8 slice 1 (FR-16); typed `ApiError` mapping (reads `{error}` body, `429`→friendly, retryable flag) shared by all clients, `researchCompetitor` + minimal `ResearchBar` (the missing M5 frontend; `noValidate` so custom `isHttpUrl` wins over native `type=url`), backend `OpenRouterError`→`ResearchError(429)` so rate limits surface as `429`, `useCompetitors` splits real server errors (error+Retry) from the dev mock-fallback by error type, `react-hooks/set-state-in-effect` forced the retry refactor.
