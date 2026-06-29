# ADR 004 — Use OpenRouter for LLM Summarization

## Context

The research feature (FR-9 / milestone M5) needs to turn raw fetched competitor pages into short summaries and structured feature ratings. During development the Claude Code agent can do this, but the **deployed app on Vercel has no agent at runtime** — a serverless function needs its own programmatic LLM to do summarization.

We want model flexibility (try cheap models for bulk summarization, stronger models when needed) without wiring up multiple provider SDKs and keys.

## Decision

Use **OpenRouter** (`https://openrouter.ai/api/v1`) as the LLM gateway for server-side summarization.

- **Where:** only inside serverless functions (e.g. `POST /api/research`, and any summarize step). The frontend never calls it.
- **How:** OpenRouter is OpenAI-compatible, so we call it with plain `fetch` (or the `openai` SDK pointed at the OpenRouter base URL) — no per-provider SDK.
- **Auth:** `OPENROUTER_API_KEY` stored in Vercel environment variables (and local `.env`, gitignored). Documented in `.env.example`.
- **Model:** configurable via `OPENROUTER_MODEL` env var rather than hardcoded, so it can be swapped without code changes. OpenRouter exposes many models including Claude (`anthropic/claude-*`), so we can route to a Claude model for quality or a cheaper model for bulk work.

## Consequences

- New external dependency: OpenRouter account + API key. Covered by this ADR (no separate dep ADR needed).
- Summarization is a pure, testable transform: (page text) → (summary + ratings). The HTTP call is isolated behind a small client module so it can be mocked in tests.
- Cost/rate limits are per OpenRouter usage; keep summarization server-side and cache results in Postgres to avoid re-summarizing unchanged pages.
- Does not change the deploy target (Vercel) or DB (Postgres/Neon); it only adds the runtime LLM call the research step needs.
