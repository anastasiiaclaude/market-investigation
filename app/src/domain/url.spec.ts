import { describe, it, expect } from 'vitest';
import { isHttpUrl } from './url';

describe('isHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isHttpUrl('https://www.example.com/')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('mailto:x@example.com')).toBe(false);
    expect(isHttpUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects unparseable or empty input', () => {
    expect(isHttpUrl('not a url')).toBe(false);
    expect(isHttpUrl('example.com')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });
});
