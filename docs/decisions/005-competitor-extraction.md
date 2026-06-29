# ADR 005 — Competitor Page Extraction

## Context

The research feature (FR-8, milestone M5) needs to turn a competitor's website into structured data: fetch the relevant page(s), strip them to clean text, and hand that text to the summarizer ([ADR 004](004-openrouter-summarization.md)) which produces a summary + feature ratings.

Raw HTML is noisy (nav, scripts, styling) and large. Sending it straight to the LLM wastes tokens and degrades quality, so we need a deliberate extraction step before summarization.

## Decision

Add an **extraction step** inside the research serverless function, run before summarization.

- **Fetch:** server-side `fetch` of the competitor URL from the `POST /api/research` function (never from the browser — avoids CORS and keeps it server-side).
- **Clean:** reduce HTML to main text content with a lightweight readability/HTML-to-text step, dropping scripts, styles, and navigation.
- **Bound:** truncate to a sensible character budget before summarization to control token cost.
- **Shape:** the extractor is a pure function `(html) → cleanText`, isolated from the network call so it can be unit-tested on fixtures.
- **Cache:** store the extracted text / its hash in Postgres so unchanged pages are not re-fetched or re-summarized (supports dedup, FR-11).

## Consequences

- One small extraction module with a pure core + a thin fetch wrapper; tests run against saved HTML fixtures, no network.
- A possible new dependency (an HTML-to-text / readability library) — covered by this ADR.
- Extraction quality directly affects summary quality; if a competitor site is JS-rendered and returns little text, that case is surfaced as a handled error (FR-16), not a silent empty summary.
- Keeps token usage and OpenRouter cost down by never sending raw HTML to the model.
