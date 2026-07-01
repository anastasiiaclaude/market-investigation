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
- [ADR 001 — Agent structure](docs/decisions/001-agent-structure.md)
- [ADR 002 — Add backend](docs/decisions/002-add-backend.md)
- [ADR 003 — Vercel serverless + Postgres (Neon)](docs/decisions/003-deploy-vercel-serverless.md)
- [ADR 004 — OpenRouter summarization](docs/decisions/004-openrouter-summarization.md)
- [ADR 005 — Competitor extraction](docs/decisions/005-competitor-extraction.md)
- [ADR 006 — Zod validation](docs/decisions/006-zod-validation.md)
- [Constraints](docs/constraints.md)
- Retrospectives: _(see Self-improvement log below)_

## Self-improvement log

- [001-hello-world](docs/retrospectives/001-hello-world.md) — bootstrap retrospective; recorded the nc workaround on Windows and the eslint-plugin-react limitation.
- [002-vercel-skeleton](docs/retrospectives/002-vercel-skeleton.md) — M1; web-standard `api/` handlers (no `@vercel/node` dep), vitest root moved to repo root, fixed deprecated `baseUrl` build break.
- [003-comparison-core](docs/retrospectives/003-comparison-core.md) — M2; Zod 4 top-level formats (`z.url()`), exhaustive feature-record via explicit `z.object`, `erasableSyntaxOnly` rules out enums (used `as const` unions).
- [004-comparison-table](docs/retrospectives/004-comparison-table.md) — M3; relative gap rule (weak/absent AND a competitor stronger), VA-INDIGO as a separate `VA_INDIGO` mock (no `isHome` flag), pure `gap.ts` keeps node-only tests (no jsdom dep), real `.rating-*` CSS + `.claude/launch.json`.
