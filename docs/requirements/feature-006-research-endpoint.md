# Feature 006 — Research endpoint (extraction + OpenRouter summarization)

Milestone **M5**. Add `POST /api/research`: given a competitor URL, the
serverless function fetches the page, extracts clean text ([ADR 005](../decisions/005-competitor-extraction.md)),
summarizes it via OpenRouter ([ADR 004](../decisions/004-openrouter-summarization.md)),
and returns a complete `Competitor` record (unpersisted). Traces to **FR-8**
(server-side fetch + extraction) and **FR-9** (LLM summary + feature ratings).

First feature to run real server-side logic and a live LLM call. Builds on M1
(skeleton) and M2 (the `Competitor`/`features` Zod schema, whose `z.strictObject`
was written to validate this LLM output).

## User story

As the product manager, I want to paste a competitor's URL and get back a short
summary and strong/adequate/weak/absent ratings across the six feature areas,
so I can add a researched competitor to the comparison without hand-scoring it.

## Design decisions (confirmed)

- **Schema reuse.** The handler validates the model's output with the existing
  `featuresSchema` / `competitorSchema` from `app/src/domain/competitor.ts` —
  one source of truth for the rating scale and feature areas. The backend
  imports the domain module directly (no duplication).
- **Extraction is dependency-free.** A pure `(html) => cleanText` function
  strips `<script>/<style>/<nav>` and tags, decodes common entities, collapses
  whitespace, and truncates to a character budget. Tested on saved HTML
  fixtures — no new dependency, no network in tests.
- **Return a full `Competitor`.** The model produces `name`, `description`
  (the summary), and the six `features` ratings; the handler fills `website`
  (the posted URL), `updatedAt` (now), and a provisional `id` (slug of name).
  Not persisted — persistence is M6.
- **OpenRouter via `fetch`.** OpenAI-compatible chat-completions call behind a
  thin wrapper; prompt building and reply parsing are pure and unit-tested.
  Model + key come from `OPENROUTER_MODEL` / `OPENROUTER_API_KEY` env vars.
- **Basic guardrails (M8 owns full robustness).** Validate the request,
  surface fetch/model/validation failures as clear HTTP errors. Empty/JS-page
  detection, size/rate limits, and retries are deferred to M8.
- **SSRF guard (issue #15).** Because the endpoint fetches a user-supplied URL
  server-side and (per constraints) is unauthenticated, a pure `url-guard`
  rejects loopback / link-local / private (RFC1918 / ULA) / cloud-metadata hosts
  with `400` before any network call. `new URL()` host normalization covers
  decimal/hex-encoded IPv4. Residual, still tracked in #15: no DNS resolution
  (DNS rebinding) and no redirect re-validation yet — both need a lookup /
  manual redirect handling and are deferred.

## API contract

`POST /api/research`

Request body:
```json
{ "url": "https://competitor.example.com/product" }
```

Success — `200`, a `Competitor` (validates against `competitorSchema`):
```json
{
  "id": "acme-analytics",
  "name": "Acme Analytics",
  "website": "https://competitor.example.com/product",
  "description": "Short summary produced by the model…",
  "features": {
    "realtime-dashboards": "strong",
    "data-integration": "adequate",
    "trend-analytics": "weak",
    "quality-analytics": "absent",
    "alerting": "adequate",
    "reporting": "weak"
  },
  "updatedAt": "2026-07-02T10:00:00.000Z"
}
```

Errors (JSON `{ "error": string }`):
- `400` — body is not JSON, missing `url`, `url` is not a valid URL, or `url`
  targets a non-public host (SSRF guard — see below).
- `405` — method other than `POST`.
- `500` — `OPENROUTER_API_KEY` is not configured.
- `502` — fetching the page failed, OpenRouter failed, or the model's reply
  could not be parsed/validated into the expected shape.

## Acceptance criteria

- GIVEN a valid `{ url }` and a reachable page
  WHEN `POST /api/research` runs
  THEN it responds `200` with a `Competitor` whose `website` is the posted URL,
  `description` holds the model summary, and `features` carries a rating for
  every area in `FEATURE_AREAS`.
- GIVEN raw HTML with scripts, styles, and nav
  WHEN `extract` runs
  THEN the result contains the page's visible text without script/style bodies
  or tags, whitespace collapsed, and length ≤ the character budget.
- GIVEN a model reply that is missing an area, adds an unknown area, or uses an
  invalid rating
  WHEN the reply is parsed
  THEN validation fails and the handler responds `502` (never a partial record).
- GIVEN no `OPENROUTER_API_KEY` in the environment
  WHEN `POST /api/research` runs
  THEN it responds `500` with a clear error and never calls the network.
- GIVEN a request that is not `POST`, has a non-JSON body, or omits `url`
  WHEN the endpoint runs
  THEN it responds `405` / `400` respectively without fetching or summarizing.

## Verification

Manual, with a real key (live-model criterion from issue #5):
```
curl -X POST http://127.0.0.1:5173/api/research \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.seeq.com/"}'
```
returns a `Competitor` with a summary + ratings. Automated specs mock the
network (fetch + OpenRouter) and run node-only, per project convention.

## Out of scope

- Persistence / dedup (M6, FR-10/FR-11).
- Frontend wiring, add/edit form (M7, FR-5/FR-6).
- Empty/JS-rendered-page handling, invalid-URL UX, size/rate limits, retries,
  export, Jira/Confluence, Cron (M8, FR-12–FR-16).

## Open questions

- None.
