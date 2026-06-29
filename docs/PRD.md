# PRD — market-investigation

## Problem & audience

Product managers at **VON ARDENNE** need to know how the **VA-INDIGO Analysis Suite** stacks up against competing digital platforms in the vacuum-coating equipment market. Today that intel is scattered across vendor sites and ad-hoc notes, so feature gaps and opportunities are easy to miss.

This dashboard gives a single PM a structured, locally-run view of competitors and their features, compared head-to-head with VA-INDIGO. A backend service stores the data, runs the research jobs, and handles export and Jira/Confluence integration; the dashboard makes it readable and actionable.

**Primary user:** one PM, running the app locally in a browser.

## Core user scenarios (feature list)

1. **See the competitive landscape** — view all competitors and their feature ratings in a comparison table (competitors as columns, features as rows; strong / adequate / weak / absent).
2. **Inspect one competitor** — open a card with that competitor's details (name, website, description, per-feature ratings).
3. **Switch views** — toggle between the comparison table and the cards.
4. **Spot the gaps** — identify where VA-INDIGO is weak or absent versus competitors.
5. **Edit data by hand** — add or correct a competitor record through a form.
6. **Filter & search** — narrow the table by competitor or feature.
7. **Refresh research** — have the agent re-run the web research and update the data.
8. **Export** — output the comparison to PDF/Excel.
9. **Push to tooling** — create Jira issues from identified gaps and publish the comparison to Confluence.

## Functional requirements

Numbered so the roadmap and tests can trace back to them.

| ID | Requirement |
|---|---|
| FR-1 | Display all competitors in a comparison table (competitors as columns, features as rows; strong / adequate / weak / absent). |
| FR-2 | Inspect a single competitor in a card view (name, website, description, per-feature ratings). |
| FR-3 | Toggle between table and card views; persist the choice in localStorage. |
| FR-4 | Highlight gaps where VA-INDIGO is weak or absent vs. competitors. |
| FR-5 | Add a competitor record via a form. |
| FR-6 | Edit an existing competitor record. |
| FR-7 | Filter and search the table by competitor or feature. |
| FR-8 | Run on-demand research that fetches competitor pages. |
| FR-9 | Summarize fetched pages into a summary + feature ratings via OpenRouter. |
| FR-10 | Persist competitors in the database (CRUD). |
| FR-11 | Deduplicate competitors on research so re-runs don't create duplicates. |
| FR-12 | Schedule periodic research (Vercel Cron). |
| FR-13 | Export the comparison to PDF/Excel. |
| FR-14 | Create Jira issues from identified gaps. |
| FR-15 | Publish the comparison to Confluence. |
| FR-16 | Handle loading/error states, invalid URLs, and rate limits gracefully. |

## In scope

- Comparison table and competitor cards with view toggle (FR-1–FR-4)
- Manual editing of competitor records (FR-5, FR-6)
- Filtering and search (FR-7)
- A serverless backend on Vercel for persistence, jobs, and integrations — see [ADR 002](decisions/002-add-backend.md), [ADR 003](decisions/003-deploy-vercel-serverless.md)
- Research that fetches + summarizes competitor pages via OpenRouter (FR-8, FR-9)
- Persistence + dedup in Postgres (FR-10–FR-12)
- Export to PDF/Excel (FR-13)
- Jira / Confluence integration (FR-14, FR-15)

## Out of scope

- Authentication and roles (single local user)
- Mobile version (desktop browser only)

## MVP success criteria

- Competitor data loads from `competitors.json` and renders as a comparison table.
- Each feature is rated strong / adequate / weak / absent, and gaps vs. VA-INDIGO are visible at a glance.
- The PM can switch between table and card views and inspect any single competitor.
- The dashboard runs locally with `npm run dev`, no extra infrastructure.

## References

- [Requirements overview](requirements/overview.md)
- [Technical plan](requirements/technical-plan.md)
