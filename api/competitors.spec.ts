import { describe, it, expect } from 'vitest';
import { POST, PUT, DELETE } from './competitors';

// Only the request-validation branches that short-circuit before touching the
// database are unit-tested here (no DB). The repo-backed paths are covered by the
// service/repo specs against the in-memory repo, and verified live at deploy-time.

function req(url: string, method: string, body?: string): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body,
  });
}

describe('/api/competitors request validation', () => {
  it('POST returns 400 when the body is not valid JSON', async () => {
    const res = await POST(req('http://localhost/api/competitors', 'POST', 'not json{'));
    expect(res.status).toBe(400);
  });

  it('PUT returns 400 when the id query param is missing', async () => {
    const res = await PUT(req('http://localhost/api/competitors', 'PUT', '{}'));
    expect(res.status).toBe(400);
  });

  it('DELETE returns 400 when the id query param is missing', async () => {
    const res = await DELETE(req('http://localhost/api/competitors', 'DELETE'));
    expect(res.status).toBe(400);
  });
});
