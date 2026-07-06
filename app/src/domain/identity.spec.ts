import { describe, it, expect } from 'vitest';
import { websiteKey } from './identity';

describe('websiteKey', () => {
  it('lowercases host and drops scheme, www, default port, trailing slash, and hash', () => {
    expect(websiteKey('https://www.Seeq.com/')).toBe('seeq.com');
    expect(websiteKey('http://SEEQ.com')).toBe('seeq.com');
    expect(websiteKey('https://seeq.com:443/#pricing')).toBe('seeq.com'); // 443 is https default
    expect(websiteKey('http://seeq.com:80/')).toBe('seeq.com'); // 80 is http default
  });

  it('normalizes an equivalent URL family to one key', () => {
    const key = 'seeq.com/product';
    for (const raw of [
      'https://www.seeq.com/product/',
      'https://seeq.com/product',
      'https://seeq.com:443/product/#top',
      'https://seeq.com/product/?utm_source=news&utm_medium=email',
      'http://www.seeq.com/product?gclid=abc',
    ]) {
      expect(websiteKey(raw)).toBe(key);
    }
  });

  it('keeps a distinguishing path and meaningful query, dropping only tracking params', () => {
    expect(websiteKey('https://acme.io/a')).not.toBe(websiteKey('https://acme.io/b'));
    expect(websiteKey('https://acme.io/p?id=1')).toBe('acme.io/p?id=1');
    expect(websiteKey('https://acme.io/p?id=1&utm_campaign=x')).toBe('acme.io/p?id=1');
    // remaining query params are sorted so order does not fork the key
    expect(websiteKey('https://acme.io/p?b=2&a=1')).toBe('acme.io/p?a=1&b=2');
  });

  it('keeps a non-default port (it identifies a different service)', () => {
    expect(websiteKey('https://acme.io:8443/')).toBe('acme.io:8443');
  });

  it('is never empty for a valid http(s) url and throws on an invalid url', () => {
    expect(websiteKey('https://acme.io').length).toBeGreaterThan(0);
    expect(() => websiteKey('not-a-url')).toThrow();
  });
});
