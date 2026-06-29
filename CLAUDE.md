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
  app/                       ← Vite + React + TypeScript application code
```

Governance files (`CLAUDE.md`, `README.md`, `docs/**`) live only at the root. Code lives only in `app/`.

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
- `app/vitest.config.ts` — test environment
- `docs/constraints.md` — what you must not do

## Current state

Hello world greeting rendered; no features planned yet.

## Working agreement

1. No code without a spec. Every feature begins as a file under `docs/requirements/` and a failing test under `app/src/**/*.spec.ts(x)`.
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

- [Requirements overview](docs/requirements/overview.md)
- [Technical plan](docs/requirements/technical-plan.md)
- [Feature 001 — Hello World](docs/requirements/feature-001-hello-world.md)
- [ADR 001 — Agent structure](docs/decisions/001-agent-structure.md)
- [Constraints](docs/constraints.md)
- Retrospectives: _(see Self-improvement log below)_

## Self-improvement log

- [001-hello-world](docs/retrospectives/001-hello-world.md) — bootstrap retrospective; recorded the nc workaround on Windows and the eslint-plugin-react limitation.
