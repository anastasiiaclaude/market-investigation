// Thin wrapper over the OpenRouter chat-completions API (ADR 004). OpenRouter is
// OpenAI-compatible, so this is a plain `fetch` — no per-provider SDK. The HTTP
// call is isolated here (with an injectable `fetchImpl`) so callers stay pure and
// tests never touch the network.

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Default model when `OPENROUTER_MODEL` is unset (mirrors .env.example). */
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-6';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterOptions {
  apiKey: string;
  model: string;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Send chat messages to OpenRouter and return the assistant's text content. */
export async function callOpenRouter(
  messages: ChatMessage[],
  { apiKey, model, fetchImpl = fetch }: OpenRouterOptions,
): Promise<string> {
  const res = await fetchImpl(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter request failed with status ${res.status}`);
  }

  const data = (await res.json()) as ChatCompletion;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter response missing message content');
  }
  return content;
}
