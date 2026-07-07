# Retrospective 009 — Robustness: graceful errors, invalid URL, rate limits (M8)

## What shipped

The first slice of M8 (feature 009, **FR-16**): the app now fails gracefully and
gained the missing research entry point.

- Pure [api-error.ts](../../app/src/domain/api-error.ts) turns a failed `Response`
  into a typed `ApiError { message, status, retryable }` — reads the backend's
  `{ error }` sentence, special-cases `429` into a wait-and-retry message, marks
  `429`/`5xx` retryable, and degrades safely on a non-JSON body. Every client
  (read/write/research) throws it, so all surfaces speak one language.
- Pure [url.ts](../../app/src/domain/url.ts) — `isHttpUrl` extracted from the M7
  form and shared with the research input.
- [competitors-api.ts](../../app/src/domain/competitors-api.ts) gained
  `researchCompetitor` (the frontend for M5's `POST /api/research`) and now throws
  `ApiError` from every client; a `fetch` reject becomes a `networkError`.
- Backend: [openrouter.ts](../../api/_lib/openrouter.ts) throws a typed
  `OpenRouterError` carrying the upstream status; [research.ts](../../api/_lib/research.ts)
  maps an upstream `429` to `ResearchError(429)` so a rate limit reaches the UI
  as `429` instead of a generic `502`.
- [useCompetitors](../../app/src/hooks/useCompetitors.ts) classifies failures: a
  real server error (`ApiError`) → an `error` state with **Retry** (`reload`);
  anything else → the existing mock **fallback** + banner.
- [ResearchBar.tsx](../../app/src/components/ResearchBar.tsx) (URL input + button)
  + [App.tsx](../../app/src/App.tsx) wiring (research handler, error state + retry).
  156 tests green; lint + build clean.

## Decisions

- **A research UI was pulled into FR-16 on purpose.** "Invalid URL" and "rate
  limits" only occur in the research pipeline, which had no frontend since M5 — the
  app literally told the user to "add one via research" with no control. The user
  deferred the call ("я не знаю"); recommended and confirmed building the minimal
  input rather than leaving two-thirds of FR-16 with nowhere to live.
- **Classify errors by type, not by parsing strings.** `fetchCompetitors` throws
  an `ApiError` for a non-OK status and a plain error for a parse/shape failure;
  the hook branches on `instanceof ApiError`. This is what lets a deployed `500`
  become a real error+retry while the vite-dev signature (`/api` → `index.html`,
  JSON parse throws) stays the "sample data" fallback — no more masking.
- **Rate limits are surfaced end-to-end as `429`.** A typed `OpenRouterError`
  carries the upstream status so `runResearch` can distinguish a throttle from a
  server error; the handler already forwards `ResearchError.status`, so the
  client's `429` branch (a fixed, friendly message) can actually trigger.
- **`429` gets a fixed message; other statuses reuse the server's sentence.** The
  backend already writes real sentences (`400` invalid URL, `502` fetch failed),
  so `apiError` shows those verbatim; only `429`'s raw upstream text is noise
  worth replacing.
- **No new dependency → no ADR.** All standard `fetch`/`Response`. Reused the
  `--gap`/`--notice`/`.btn` tokens; added `.research-bar`/`.error-notice` styles.

## Notes for next time

- **`type="url"` native validation preempts custom validation.** The research
  input needed `noValidate` on the form so `isHttpUrl` (with the friendly inline
  message) is the single gate — otherwise the browser's own locale-dependent
  bubble fires first and the custom `.field-error` never shows. **The M7 form has
  the same latent issue** (its website field is `type="url"` inside a form without
  `noValidate`); worth a follow-up if that inline message ever matters.
- **`react-hooks/set-state-in-effect` forbids synchronous `setState` in an
  effect.** The retry refactor initially set `loading` synchronously inside the
  mount effect and tripped the lint rule. Fix: the mount effect only sets state
  from the async result (initial state is already `loading`); `reload` — an event
  handler, not an effect — is where the synchronous `loading` reset lives.
- **Research is deploy-verified, like M5/M6/M7.** In the preview the research
  `POST` 404s; verified the typed path renders it as a clean
  `"Not Found (status 404)."` (not a raw throw) and that invalid-URL rejection
  sends no request. The live fetch→summarize→persist round-trip and a genuine
  `429` need a deploy (`OPENROUTER_API_KEY` + DB). Free-tier `429`s are expected
  there (see the OpenRouter model-config note).
- **Remaining M8 slices are untouched:** export (FR-13), Jira (FR-14), Confluence
  (FR-15), Cron (FR-12) — each its own feature/spec/retro.
