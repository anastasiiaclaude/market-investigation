# Roadmap — market-investigation

Milestone plan targeting **Vercel** (static Vite + React frontend + serverless functions in `api/`), **Vercel Postgres (Neon) + Drizzle ORM**, and **OpenRouter** for summarization. Each milestone has a **verification criterion** and a **needs secret/backend?** flag; tasks trace to the functional requirements (FR-…) in [PRD.md](PRD.md).

## ADRs to write before the code they govern

| ADR | Topic | Write before |
|---|---|---|
| [002](decisions/002-add-backend.md) | Hosting / backend on Vercel | M1 |
| [003](decisions/003-deploy-vercel-serverless.md) | Persistence — Postgres (Neon) + Drizzle (+ edits `constraints.md`) | M6 |
| [004](decisions/004-openrouter-summarization.md) | AI — OpenRouter summarization | M5 |
| [005](decisions/005-competitor-extraction.md) | Competitor page extraction | M5 |

## Milestones

| Stage | Essence | Verification criterion | FR | Needs secret/backend? |
|---|---|---|---|---|
| **M0** | Planning + ADRs (002–005), PRD, FR list | Docs merged; four ADRs written | — | no |
| **M1** | Vercel skeleton + `GET /api/health` | Deploys on Vercel; `/api/health` returns 200 | — | no |
| **M2** | Pure data model + comparison logic on **mock** (types, Zod schema, rating matrix) | Unit tests green for rating→cell mapping against mock data | FR-1 | no |
| **M3** | Comparison table render from mock + gap highlighting | Table renders mock competitors; VA-INDIGO gaps visibly flagged | FR-1, FR-4 | no |
| **M4** | Cards + view toggle + filter/search on mock | Toggle switches views (persisted); filter narrows rows; card shows one competitor | FR-2, FR-3, FR-7 | no |
| **M5** | Real extraction + OpenRouter summarization via `POST /api/research` | Posting a competitor URL returns summary + ratings from a live model | FR-8, FR-9 | AI key |
| **M6** | Postgres (Neon) + Drizzle persistence + dedup | Competitors persist across reloads; re-running research creates no duplicates | FR-10, FR-11 | DB |
| **M7** | Add/edit competitor via form wired to the API | Editing a card writes to the DB and re-renders | FR-5, FR-6 | DB |
| **M8** | Robustness + outputs: loading/error, invalid URL, limits; export; Jira/Confluence; Cron | Errors handled gracefully; export downloads; Jira/Confluence calls succeed with keys; Cron scheduled | FR-12–FR-16 | AI/DB/integration keys |

## Key sequencing idea

**M2–M4 build entirely on mock data — no secrets, no backend.** You get the first working demo early, while the real AI (M5) and database (M6) are connected later, once the skeleton already works. This also removes the tension with `docs/constraints.md`: the backend/DB is legalized via **ADR-003 exactly at M6**, when it's first actually needed — not before.

## What to do next

1. Open **GitHub Issues** for each milestone/task in this repo (labels `M0…M8`) so the plan is traceable.
2. Start **M0**: write the four ADRs (002–005) and confirm the PRD + FR list are merged.
3. Then **M1**: stand up the Vercel skeleton with `/api/health`.

## References

- [PRD](PRD.md) · [Requirements overview](requirements/overview.md) · [Technical plan](requirements/technical-plan.md)
- ADRs: [002](decisions/002-add-backend.md) · [003](decisions/003-deploy-vercel-serverless.md) · [004](decisions/004-openrouter-summarization.md) · [005](decisions/005-competitor-extraction.md)
