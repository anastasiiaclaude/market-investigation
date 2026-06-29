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

## In scope

- Comparison table and competitor cards with view toggle
- Manual editing of competitor records
- Filtering and search
- A backend service (Node + Express + SQLite) for persistence, jobs, and integrations — see [ADR 002](decisions/002-add-backend.md)
- Agent-driven research that populates the database (seeded from `competitors.json`)
- Real-time automatic parsing of data
- Export to PDF/Excel
- Jira / Confluence integration (separate task)

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
