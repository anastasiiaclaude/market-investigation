# Task Plan — market-investigation

Deployment-driven task plan targeting **Vercel** (serverless functions + Turso/libSQL).
Stack: Vite + React + TS frontend (`app/`), TypeScript serverless functions (`api/`), Turso DB.

Each phase follows the working agreement: spec → failing test → minimal code → green → commit → retro.
Features are numbered to continue from Feature 001 (hello world).

---

## Phase 0 — Foundations (infra & data shape)

Goal: agree the data contract and get a deployable skeleton on Vercel.

- [ ] **T0.1 — Lock the data schema.** Finalize the `Competitor` + feature-set shape (see technical plan). Write it as a shared TS type used by both `app/` and `api/`.
- [ ] **T0.2 — Seed data.** Create `competitors.json` with VA-INDIGO + a few real competitors (Bühler Leybold Optics, Oerlikon Balzers, Evatec, Singulus) and the feature matrix.
- [ ] **T0.3 — Vercel project setup.** Add `vercel.json` (build frontend from `app/`, expose `api/`). Connect the GitHub repo to Vercel; confirm a static deploy of the current hello-world goes green.
- [ ] **T0.4 — Turso setup.** Create a Turso DB, add `@libsql/client`, store the connection string in Vercel env + local `.env`. Write a one-time seed/migration script that loads `competitors.json` into the DB.

## Phase 1 — Read path (Feature 002 + 003)

Goal: the dashboard shows real data from the API.

- [ ] **T1.1 — `GET /api/competitors` function.** Serverless handler reads from Turso, returns the competitor list. Spec the query/serialization logic as a pure module.
- [ ] **T1.2 — Feature 002: comparison table.** `CompetitorTable` renders the strong/adequate/weak/absent matrix from the API. Pure rating-to-cell logic is unit-tested.
- [ ] **T1.3 — Feature 003: cards + view toggle.** `CompetitorCard` + `ViewToggle`; persist the chosen view in localStorage.
- [ ] **T1.4 — Gap highlighting.** Visually flag where VA-INDIGO is weak/absent vs. competitors (core success criterion).

## Phase 2 — Write path (Feature 004 + 005)

Goal: the PM can manage data and find things.

- [ ] **T2.1 — `POST/PUT /api/competitors` functions.** Create/update handlers with input validation (pure validators, unit-tested).
- [ ] **T2.2 — Feature 004: competitor form.** `CompetitorForm` calls the API to add/edit a record; optimistic UI update.
- [ ] **T2.3 — Feature 005: filter & search.** Client-side filtering/search over the table (pure filter module, unit-tested).

## Phase 3 — Research automation (Feature 006)

Goal: data refreshes itself.

- [ ] **T3.1 — Research function.** `POST /api/research` runs WebSearch/WebFetch-driven extraction and upserts competitors into Turso. Parsing/normalization logic is a pure, tested module.
- [ ] **T3.2 — Vercel Cron.** Schedule the research function (e.g. weekly); add an on-demand "Refresh" button in the UI.

## Phase 4 — Output & integrations (Feature 007–009)

Goal: get findings out of the tool.

- [ ] **T4.1 — Feature 007: export.** `GET /api/export?format=pdf|xlsx` generates the comparison file server-side; UI download button.
- [ ] **T4.2 — Feature 008: Jira.** `POST /api/jira/issues` creates issues from identified feature gaps via the Atlassian REST API (token in env). Gap→issue mapping is a pure, tested module.
- [ ] **T4.3 — Feature 009: Confluence.** `POST /api/confluence/page` publishes the comparison table as a page.
- [ ] **T4.4 — (optional) Telegram notify.** Notify on new issues/pages created (from the original brief).

---

## Sequencing & dependencies

- Phase 0 blocks everything (schema + deploy + DB).
- Phases 1→2→3→4 are roughly sequential; within a phase, tasks can interleave.
- The **first buildable slice** is T0.1–T0.3 then **Feature 002** (T1.2) — that proves the end-to-end path (DB → API → table on Vercel).

## Open decisions

- Exact feature set (rows of the matrix) — fix during T0.1/T0.2.
- Export library choice (PDF/Excel) — pick during T4.1 via a short ADR if a new dep is needed.
- Auth stays out of scope; the deployed app is single-user. If the Vercel URL must be private, revisit (Vercel password protection) — not now.

## References

- [PRD](PRD.md) · [Requirements overview](requirements/overview.md) · [Technical plan](requirements/technical-plan.md)
- [ADR 002 — Add backend](decisions/002-add-backend.md) · [ADR 003 — Vercel serverless + Turso](decisions/003-deploy-vercel-serverless.md)
