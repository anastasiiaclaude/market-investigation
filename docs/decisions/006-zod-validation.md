# ADR 006 — Zod for data validation

## Context

Milestone M2 ([issue #2](https://github.com/anastasiiaclaude/market-investigation/issues/2)) introduces the core `Competitor` data model. The roadmap and the M2 issue call for a **schema**, not just TypeScript types: the same shape will later be validated at two untrusted boundaries — the OpenRouter summarization output (M5, [ADR 004](004-openrouter-summarization.md)) and the Postgres/API layer (M6, [ADR 003](003-deploy-vercel-serverless.md)).

TypeScript types are erased at build time and give no runtime guarantee. We need one schema definition that (a) is the single source of truth for the `Competitor` type via inference, and (b) validates data at runtime where it enters the system.

[constraints.md](../constraints.md) forbids new runtime dependencies without an ADR. This ADR authorizes that dependency.

## Decision

Adopt **Zod (v4)** as the validation layer, installed in `app/`.

- Define `competitorSchema` (and the `Rating` / feature-area enums) once in `app/src/domain/competitor.ts`; derive the `Competitor` TypeScript type with `z.infer`, so type and runtime schema can never drift.
- Expose a pure `parseCompetitor(input: unknown): Competitor` wrapper; validation stays in a pure module, testable without the network or DB.
- In M2 the schema validates the mock fixtures. At M5/M6 the **same** schema validates LLM output and DB rows — no second definition.

## Consequences

- One new runtime dependency (`zod`) in `app/package.json`. Chosen over hand-rolled validation because the schema is reused across three milestones and Zod gives type inference for free.
- Zod 4 uses top-level string formats (`z.url()`, `z.email()`); `z.string().url()` is deprecated. New code uses the top-level forms.
- If Zod ever proves too heavy for the serverless bundle, validation is isolated in one module and can be swapped; the `parseCompetitor` boundary keeps callers unaffected.
