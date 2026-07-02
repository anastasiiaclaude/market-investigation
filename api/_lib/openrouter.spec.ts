import { describe, it, expect, vi } from 'vitest';
import { callOpenRouter, OPENROUTER_URL } from './openrouter';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const messages = [{ role: 'user' as const, content: 'hello' }];

describe('callOpenRouter', () => {
  it('posts messages to OpenRouter with model + bearer auth and returns content', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'the reply' } }] }),
    );
    const content = await callOpenRouter(messages, {
      apiKey: 'sk-test',
      model: 'anthropic/claude-sonnet-4-6',
      fetchImpl,
    });

    expect(content).toBe('the reply');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(OPENROUTER_URL);
    expect(init?.method).toBe('POST');
    const headers = new Headers(init?.headers);
    expect(headers.get('authorization')).toBe('Bearer sk-test');
    const sent = JSON.parse(init?.body as string);
    expect(sent.model).toBe('anthropic/claude-sonnet-4-6');
    expect(sent.messages).toEqual(messages);
  });

  it('throws when OpenRouter responds non-ok', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'nope' }, 429));
    await expect(
      callOpenRouter(messages, { apiKey: 'k', model: 'm', fetchImpl }),
    ).rejects.toThrow(/429/);
  });

  it('throws when the response has no message content', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ choices: [] }));
    await expect(
      callOpenRouter(messages, { apiKey: 'k', model: 'm', fetchImpl }),
    ).rejects.toThrow(/content/i);
  });
});
