// Orchestrates the research pipeline (ADR 004 + ADR 005): fetch the competitor
// page, extract clean text, summarize + rate it via OpenRouter, and assemble a
// schema-valid Competitor. Each stage's failure is surfaced as a ResearchError
// carrying the HTTP status the handler should return.

import { extract } from './extract.js';
import { buildResearchPrompt, parseResearchReply } from './summarize.js';
import { callOpenRouter, OpenRouterError } from './openrouter.js';
import { toCompetitor } from '../../app/src/domain/research.js';
import type { Competitor } from '../../app/src/domain/competitor.js';
import type { CompetitorRepo } from './db/repository.js';

/** A pipeline failure with the HTTP status the endpoint should respond with. */
export class ResearchError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ResearchError';
    this.status = status;
  }
}

export interface RunResearchOptions {
  url: string;
  apiKey: string;
  model: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests; defaults to now. */
  now?: Date;
  /**
   * When provided, the assembled competitor is upserted (dedup by URL id, M6).
   * Omitting it yields the unpersisted competitor — used by pure unit tests.
   */
  repo?: CompetitorRepo;
}

export async function runResearch({
  url,
  apiKey,
  model,
  fetchImpl = fetch,
  now = new Date(),
  repo,
}: RunResearchOptions): Promise<Competitor> {
  let html: string;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    html = await res.text();
  } catch (cause) {
    throw new ResearchError(`Failed to fetch the page: ${(cause as Error).message}`, 502);
  }

  const cleanText = extract(html);

  let reply: string;
  try {
    reply = await callOpenRouter(buildResearchPrompt(cleanText), { apiKey, model, fetchImpl });
  } catch (cause) {
    // Surface a rate limit as 429 (the handler forwards it) so the UI can show a
    // wait-and-retry message; any other upstream failure stays a 502.
    if (cause instanceof OpenRouterError && cause.status === 429) {
      throw new ResearchError(
        'The AI service is rate-limited right now. Please try again in a moment.',
        429,
      );
    }
    throw new ResearchError(`Summarization failed: ${(cause as Error).message}`, 502);
  }

  let competitor: Competitor;
  try {
    competitor = toCompetitor(parseResearchReply(reply), url, now);
  } catch (cause) {
    throw new ResearchError(
      `Model returned unexpected data: ${(cause as Error).message}`,
      502,
    );
  }

  if (!repo) return competitor;

  // Persist with dedup by URL id (FR-11): a re-run on the same URL updates the row.
  try {
    return await repo.upsert(competitor);
  } catch (cause) {
    throw new ResearchError(`Failed to persist competitor: ${(cause as Error).message}`, 500);
  }
}
