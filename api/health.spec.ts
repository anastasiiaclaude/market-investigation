import { describe, it, expect } from 'vitest';
import { GET } from './health';

describe('GET /api/health', () => {
  it('responds with HTTP 200', () => {
    expect(GET().status).toBe(200);
  });

  it('responds with a JSON ok body', async () => {
    const res = GET();
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
