import { describe, it, expect } from 'vitest';
import { buildHealthResponse, HEALTH_OK_STATUS } from './health';

describe('health', () => {
  it('reports an ok status body', () => {
    expect(buildHealthResponse()).toEqual({ status: 'ok' });
  });

  it('uses HTTP 200 for a healthy response', () => {
    expect(HEALTH_OK_STATUS).toBe(200);
  });
});
