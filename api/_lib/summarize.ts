// Pure summarization logic: build the prompt sent to the model and parse its
// reply back into a validated ResearchResult. No network here — the HTTP call
// lives in openrouter.ts. All Zod validation is reused from the app domain
// (parseResearchResult), so `api/` never imports `zod` directly.

import type { ChatMessage } from './openrouter';
import {
  FEATURE_AREAS,
  FEATURE_AREA_LABELS,
  RATINGS,
} from '../../app/src/domain/competitor';
import { parseResearchResult, type ResearchResult } from '../../app/src/domain/research';

const featureList = FEATURE_AREAS.map(
  (area) => `- "${area}" (${FEATURE_AREA_LABELS[area]})`,
).join('\n');

/**
 * Build the chat messages instructing the model to summarize a competitor page
 * and rate it across the fixed feature areas, returning strict JSON.
 */
export function buildResearchPrompt(cleanText: string): ChatMessage[] {
  const system = [
    'You are a competitive-analysis assistant for an industrial-software product.',
    'Given the text of a competitor product page, respond with ONLY a JSON object',
    '(no prose, no markdown fences) of the exact shape:',
    '{',
    '  "name": string,        // the product or company name',
    '  "description": string, // a 1-2 sentence neutral summary of what it does',
    '  "features": {          // rate EVERY area below, no more and no fewer',
    FEATURE_AREAS.map((area) => `    "${area}": one of ${RATINGS.map((r) => `"${r}"`).join(' | ')}`).join(
      ',\n',
    ),
    '  }',
    '}',
    '',
    'Rate how well the product covers each feature area:',
    featureList,
    '',
    `Each rating must be exactly one of: ${RATINGS.join(', ')}.`,
    'Use "absent" when the page gives no evidence the area is covered.',
  ].join('\n');

  const user = `Competitor page text:\n\n${cleanText}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/** Pull the first JSON object out of a model reply (tolerates fences/prose). */
function extractJsonObject(content: string): string {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Model reply contained no JSON object');
  }
  return content.slice(start, end + 1);
}

/** Parse and validate a model reply into a ResearchResult; throws on bad shape. */
export function parseResearchReply(content: string): ResearchResult {
  const parsed: unknown = JSON.parse(extractJsonObject(content));
  return parseResearchResult(parsed);
}
