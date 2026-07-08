import { describe, it, expect } from 'vitest';
import { apiError, networkError, ApiError } from './api-error';

/** Build a Response with the given body/status/content-type. */
function res(body: string | null, status: number, contentType = 'application/json') {
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

describe('apiError', () => {
  it('maps 429 to a retryable rate-limit message, ignoring the raw body', async () => {
    const err = await apiError(res(JSON.stringify({ error: 'upstream 429 blah' }), 429));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/try again/i);
    expect(err.message).not.toContain('upstream 429 blah');
  });

  it('uses the server {error} sentence for a 400 (not retryable)', async () => {
    const err = await apiError(res(JSON.stringify({ error: 'Body must include a valid http(s) "url"' }), 400));
    expect(err.message).toBe('Body must include a valid http(s) "url"');
    expect(err.retryable).toBe(false);
  });

  it('uses the server sentence for a 5xx and marks it retryable', async () => {
    const err = await apiError(res(JSON.stringify({ error: 'Failed to fetch the page' }), 502));
    expect(err.message).toBe('Failed to fetch the page');
    expect(err.retryable).toBe(true);
  });

  it('degrades to a usable message when the body is not JSON', async () => {
    const err = await apiError(res('<!doctype html><html></html>', 500, 'text/html'));
    expect(err.status).toBe(500);
    expect(err.retryable).toBe(true);
    expect(err.message.length).toBeGreaterThan(0);
    expect(err.message).not.toContain('<html>');
  });

  it('handles an empty body without throwing (4xx not retryable)', async () => {
    const err = await apiError(res(null, 404));
    expect(err.status).toBe(404);
    expect(err.retryable).toBe(false);
    expect(err.message.length).toBeGreaterThan(0);
  });
});

describe('networkError', () => {
  it('is a retryable ApiError with status 0 and a reachable-server message', () => {
    const err = networkError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.retryable).toBe(true);
    expect(err.message.length).toBeGreaterThan(0);
  });
});
