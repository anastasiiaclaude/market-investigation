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
Self-improvement log) and git history, not here. Also: gaps → Jira Tasks, comparison
→ a Confluence page, and CSV / print-to-PDF export.

**Shape**

- **Frontend** (`app/src`): pure logic in `domain/` (tested), rendering in
  `components/`, React glue in `hooks/` (untested by design). `App.tsx` is the
  dashboard.
- **Backend** (`api/`): web-standard handlers, pure logic in `api/_lib/`.
  `POST /api/research` (fetch → `extract` → OpenRouter → `Competitor`), CRUD
  `/api/competitors` (by-id ops use `?id=` — URL-key ids contain slashes),
  `POST /api/jira` (gaps → Jira Tasks, deduped) + `POST /api/confluence` (comparison
  → one page, create-or-update; ADR 008, shared `api/_lib/atlassian.ts`),
  `GET /api/cron` (daily Vercel Cron re-researches all saved competitors; bearer
  `CRON_SECRET`), `GET /api/health`.
- **DB**: Postgres (Neon) + Drizzle behind a `CompetitorRepo` seam — `drizzleRepo`
  (live) + `inMemoryRepo` (tests). `api/` is its own sub-package (`api/package.json`)
  for the DB driver; migrations + idempotent seed in `api/drizzle/` + `_scripts/`,
  applied automatically at deploy time via the `buildCommand` (`db:deploy`; ADR 009).

**Load-bearing invariants**

- **All Zod lives in `app/src`.** The backend imports schemas transitively so
  `api/` stays dependency-free (except its DB sub-package) and both vitest + the
  Vercel bundler resolve `zod` from `app/node_modules`.
- **URL identity.** `websiteKey(url)` (`domain/identity.ts`) is the DB primary key
  = research dedup key = REST id; set on every `toCompetitor`. Website is
  immutable on edit.
- **`api/*` isn't served by vite dev.** Research + CRUD round-trips run on Vercel
  (need `OPENROUTER_API_KEY` + DB). Vite-only dev falls back to `MOCK_COMPETITORS`
  + a "sample data" banner; a real server error shows an error + Retry instead
  (FR-16, via typed `domain/api-error.ts` `ApiError`).
- **ESM extensions are load-bearing on Vercel.** `api/package.json` is
  `"type": "module"`, so Vercel emits each handler as an un-bundled native-ESM
  `.js` — every relative import in the compiled graph (all `api/**` + the
  `app/src/domain` modules it reaches) MUST carry a `.js` extension or the
  function crashes at runtime with `ERR_MODULE_NOT_FOUND`. Local `build`/`test`/
  `lint` do NOT catch this (Vite/vitest/tsc resolve `.js`→`.ts`), so it is only
  caught on a real deploy. `_scripts/seed.ts` is the exception — it runs under
  `node --experimental-strip-types`, which needs `.ts`. Fixed + deploy-verified
  (`/api/health` returns `ok`) in PR #27; the API had never actually run on
  Vercel before that.

**Open**

- **M8 complete** — FR-12…FR-16 all shipped (robustness 009, Jira 010, Confluence 011,
  export 012, Cron 013). App is deployed + live on Vercel. Atlassian creds
  (`ATLASSIAN_*`) + `CRON_SECRET` are deploy-only.
- Unauthenticated ad-hoc write endpoints (research/competitors/jira/confluence) —
  tracked in #25 (single-user posture; deferred). `/api/cron` is bearer-protected.
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
- [Feature 010 — Jira issues from gaps (M8)](docs/requirements/feature-010-jira-gaps.md)
- [Feature 011 — Publish comparison to Confluence (M8)](docs/requirements/feature-011-confluence-publish.md)
- [Feature 012 — Export to PDF/Excel (M8)](docs/requirements/feature-012-export.md)
- [Feature 013 — Cron scheduled research (M8)](docs/requirements/feature-013-cron.md)
- [ADR 001 — Agent structure](docs/decisions/001-agent-structure.md)
- [ADR 002 — Add backend](docs/decisions/002-add-backend.md)
- [ADR 003 — Vercel serverless + Postgres (Neon)](docs/decisions/003-deploy-vercel-serverless.md)
- [ADR 004 — OpenRouter summarization](docs/decisions/004-openrouter-summarization.md)
- [ADR 005 — Competitor extraction](docs/decisions/005-competitor-extraction.md)
- [ADR 006 — Zod validation](docs/decisions/006-zod-validation.md)
- [ADR 007 — `api/` sub-package; Drizzle + Neon; URL identity](docs/decisions/007-api-subpackage-drizzle.md)
- [ADR 008 — Atlassian integration (Jira + Confluence)](docs/decisions/008-atlassian-integration.md)
- [ADR 009 — Deploy-time DB migrations + seed](docs/decisions/009-deploy-time-db-migrations.md)
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
- [010-jira-gaps](docs/retrospectives/010-jira-gaps.md) — M8 slice 2 (FR-14, ADR 008); gaps→Jira Tasks in `KAN`, pure `domain/jira.ts` (gap→spec + minimal ADF since v3 needs ADF-not-string), `api/_lib/jira.ts` (Basic-auth, marker-label dedup via `/search/jql`, create, sync) + thin `api/jira.ts`, `syncJiraGaps` client + `IntegrationsBar`. Real `KAN` metadata read via the Atlassian MCP before coding. Review caught: `strictNullChecks` error `api/build` misses (**root build doesn't `tsc` `api/`**), duplicated `JiraSyncResult` (unified to one `app/src` Zod schema + validated reply), `summarize` moved out of the component, `strongerCompetitors`/`gapAreas` extracted to `gap.ts`.
- [011-confluence-publish](docs/retrospectives/011-confluence-publish.md) — M8 slice 3 (FR-15, ADR 008); comparison → one canonical page in `SOFTWAREEN`, create-or-update by title (v2 needs numeric `spaceId`, resolved from key; update reads version + PUTs `+1`). Pure `domain/confluence.ts` (storage-format XHTML + `escapeXml` + result schema), `api/_lib/confluence.ts`, thin `api/confluence.ts`, `publishConfluence` client + second `IntegrationsBar` button. Live page published + find-by-title confirmed via the MCP. Review-driven DRY: shared `api/_lib/atlassian.ts` now holds `errorResponse`/`readAtlassianCreds`/`parseHomeAndCompetitors`/`jsonAuthHeaders`/`fetchJson`, so both handlers shed ~40 lines and the next integration inherits the seam. Review also gated integrations on `ready` state (don't publish mock data) + `z.url()` on the reply.
- [012-export](docs/retrospectives/012-export.md) — M8 slice 4 (FR-13); **dependency-free, no ADR**. Pure `domain/export.ts` `toCsv` off `buildComparison` (rating labels, `(gap)` suffix, CSV escaping) + `ExportBar` (Blob+UTF-8 BOM download / `window.print()`) + an `@media print` block. WYSIWYG (exports the filtered view); not gated on `ready` (local read-only). Review added `neutralizeFormula` (CSV formula-injection guard, like the earlier `javascript:` hardening). First M8 slice fully browser-verifiable (BOM checked in the downloaded bytes).
- [013-cron](docs/retrospectives/013-cron.md) — M8 slice 5 (FR-12), **completes M8**. Daily Vercel Cron `GET /api/cron` re-researches all saved competitors: pure `api/_lib/cron.ts` `refreshAllCompetitors` (loops the existing `runResearch` per item, **per-competitor failure isolation** → `{refreshed, failed}`) + thin bearer-protected handler (`CRON_SECRET`, fail-closed) + `vercel.json` `crons`. Lesson: the earlier Jira/Confluence handlers merged with extensionless imports (broke the deploy until fixed to `.js`) — the ESM `.js` invariant is documented but `tsc` won't enforce it; check new `api/` code by hand.
- [014-atlassian-reskin](docs/retrospectives/014-atlassian-reskin.md) — **presentation-only** redesign into the Atlassian Design System (the app already talks to Jira/Confluence, so it now looks native): real ADS tokens (brand `#0C66E4`, ink `#172B4D`, sunken page + raised panels, 14px base, Inter), a sticky app-shell nav + page header, and the **signature** — rating cells as Jira **status lozenges** (Strong→Success … Gap→Removed) with the home column pinned. `Push gaps to Jira`/`Publish to Confluence` moved to header actions; `IntegrationsBar` slimmed to status-only. No ADR/spec (like 012 export); 226 tests unchanged. Lesson: preview screenshots wedged all session, so verified via `getComputedStyle`/geometry through `javascript_tool` instead.
