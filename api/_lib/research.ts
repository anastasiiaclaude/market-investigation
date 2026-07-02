// Orchestrates the research pipeline (ADR 004 + ADR 005): fetch the competitor
// page, extract clean text, summarize + rate it via OpenRouter, and assemble a
// schema-valid Competitor. Each stage's failure is surfaced as a ResearchError
// carrying the HTTP status the handler should return.

import { extract } from './extract';
import { buildResearchPrompt, parseResearchReply } from './summarize';
import { callOpenRouter } from './openrouter';
import { toCompetitor } from '../../app/src/domain/research';
import type { Competitor } from '../../app/src/domain/competitor';

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
}

export async function runResearch({
  url,
  apiKey,
  model,
  fetchImpl = fetch,
  now = new Date(),
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
    throw new ResearchError(`Summarization failed: ${(cause as Error).message}`, 502);
  }

  try {
    return toCompetitor(parseResearchReply(reply), url, now);
  } catch (cause) {
    throw new ResearchError(
      `Model returned unexpected data: ${(cause as Error).message}`,
      502,
    );
  }
}
