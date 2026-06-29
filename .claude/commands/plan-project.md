---
name: plan-project
description: Turn a project's scope into a structured technical planning document (frontend, backend, integrations, data, MVP scope). Primary source is the project's docs/requirements/overview.md; a pasted project description is used as a secondary/supplementary source (or as the only source when no project exists yet). Writes docs/requirements/technical-plan.md when run inside an agentic-starter / boilerplate-webapp project. Use before building the first real feature.
---

# Plan Project — generate the technical planning document

You turn a project idea into a structured technical plan. This is the artifact
the rest of the course builds features against.

## Input — scope source priority

**First priority — the project's `overview.md`.** If
`docs/requirements/overview.md` exists, it is the authoritative scope source
(Goal, Primary user, Success criteria, Out of scope). Read it and use it. Do not
re-ask what is already written there.

**Second priority — a pasted project description.** If the user also pastes a
project goal/idea in the prompt (e.g. a sticky-note idea like *"digest of posts
from selected Telegram channels over a period; parameters: channel, period"*,
optionally with tech notes like *"API Telegram, telegram bot, search by tags"*),
treat it as supplementary: use it to fill gaps the overview leaves open, but if
it conflicts with `overview.md`, the overview wins — surface the conflict via
**AskUserQuestion** rather than silently overriding.

**Fallback — no overview yet.** If there is no `overview.md` (just an idea and no
scaffolded project), use the pasted description alone as the scope source.

## Before you write anything

1. **Read the non-negotiables** if a project exists: open `docs/constraints.md`.
   The boilerplate is a **pure Vite + React + TypeScript static app with no
   backend / no server / no database** unless an ADR changes that. Hold this
   against the project idea. (If there is no project yet, assume this same
   baseline — it is what every course project starts from.)
2. **Pre-fill, then ask only about gaps.** Infer as much as you can from the
   idea / overview. Use **AskUserQuestion** only for the dimensions you
   genuinely cannot determine, and ask at most 4 questions at once. A thin
   sticky-note idea will usually need 2–4 questions; a detailed one may need none.

## What to find out (the five dimensions)

For each, prefer the overview/constraints first, ask only if unclear:

1. **Frontend** — what the user sees. Screens / components / main view. Default
   stack is the boilerplate's Vite + React + TS. Some projects have *no* UI
   (e.g. a Telegram bot) — say so explicitly.
2. **Backend** — does the idea need a server, scheduled jobs, or a database?
   Many course ideas do (Telegram bots, alerting, data storage, LLM streaming).
   **The boilerplate has none.** If a backend is required, this is a CONFLICT
   with `docs/constraints.md` — do not silently assume it away.
3. **Integrations** — external services and *how* they are reached: Telegram
   API, Facebook/Instagram API, the Claude/LLM API, Google Sheets, Jira,
   Confluence, a booking system, etc. For each, note: official API vs. a Cowork
   connector vs. the `gws` CLI vs. a community library.
4. **Data & storage** — what data exists, where it lives (in-memory,
   `localStorage`, a JSON file, an external DB). Flag anything that needs real
   persistence, since that implies a backend.
5. **MVP scope for the course** — the smallest slice that is buildable across
   Modules 4–8 **inside the boilerplate's constraints**. This is the most
   important section: it is where an ambitious idea becomes a realistic
   course project.

## Handling the backend / constraints conflict (do not skip)

If the idea needs a backend, persistence, or scheduled jobs that the static
boilerplate cannot provide, surface it plainly and offer the user a scoping
choice via **AskUserQuestion**, e.g.:

- **Frontend slice only** — build the UI against mocked / sample data; the real
  API or bot comes after the course.
- **Add a backend via ADR** — record a `docs/decisions/NNN-*.md` that loosens the
  "no backend" constraint (heavier; only if the user is comfortable).
- **Reframe as a thin client** — call the external API directly from the
  frontend where CORS / keys allow it.

Write the chosen approach into the MVP section. Never just write "needs a
backend" and stop.

## Output — where it goes

- **Inside a project** (a `docs/requirements/` directory exists): write the plan
  to `docs/requirements/technical-plan.md`.
- **No project yet** (idea pasted, no boilerplate around): output the plan inline
  in the response so the user can review it, and tell them it will land in
  `docs/requirements/technical-plan.md` once they scaffold the project.

Use exactly these sections:

```markdown
# Technical Plan — <project name>

## Summary
<1–2 lines, pulled from overview.md goal>

## Frontend
- Stack: <Vite + React + TS, or "no UI — <reason>">
- Main views / components: <bullet list>

## Backend
- Needed? <yes/no>
- If yes: <what it must do> — and how we handle it under the no-backend
  constraint (see MVP section)

## Integrations
| Service | Purpose | How (API / connector / gws / library) | Auth / key needed |
|---|---|---|---|
| <e.g. Telegram> | <e.g. read channel posts> | <e.g. Bot API> | <e.g. bot token> |

## Data & storage
- <what data, where it lives, persistence needs>

## MVP scope for the course (Modules 4–8)
- **First feature (M4):** <one concrete, buildable slice>
- **Then:** <2–4 follow-on slices, smallest useful first>
- **Explicitly NOT in the course MVP:** <the ambitious parts deferred>
- **How we fit the boilerplate constraints:** <mocked data / thin client / ADR>

## Open questions / risks
- <bullets — anything ambiguous or risky>
```

## After writing

- Keep it honest and short — this is a planning doc, not a design spec.
- **Link the new plan from `CLAUDE.md`.** If a `CLAUDE.md` exists at the repo
  root and has a "Docs" section (the boilerplate ships one), add a bullet linking
  `docs/requirements/technical-plan.md` there. The boilerplate keeps `CLAUDE.md`
  as the navigable index of governance docs, so an unlinked plan is effectively
  invisible to the next agent turn — this single line keeps the index honest.
  This is the only `CLAUDE.md` edit you make; do not touch its other sections.
- Tell the user the file path and summarize the MVP slice in 2–3 sentences.
- Suggest (do not auto-create) the first `docs/requirements/feature-002-*.md`
  so the user starts Module 4 with a clear first feature.
- Do NOT write any application code. Do NOT install dependencies. Do NOT modify
  `overview.md` or `constraints.md`.
