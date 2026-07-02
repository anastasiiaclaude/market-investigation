import { describe, it, expect } from 'vitest';
import { assertPublicUrl, isBlockedHost, BlockedUrlError } from './url-guard';

describe('isBlockedHost', () => {
  it('blocks loopback hostnames and addresses', () => {
    expect(isBlockedHost('localhost')).toBe(true);
    expect(isBlockedHost('127.0.0.1')).toBe(true);
    expect(isBlockedHost('127.255.255.254')).toBe(true);
    expect(isBlockedHost('[::1]')).toBe(true);
    expect(isBlockedHost('::1')).toBe(true);
  });

  it('blocks the trailing-dot FQDN form (URL keeps the root dot)', () => {
    expect(isBlockedHost('localhost.')).toBe(true);
    expect(isBlockedHost('foo.localhost.')).toBe(true);
  });

  it('blocks the cloud-metadata and link-local range', () => {
    expect(isBlockedHost('169.254.169.254')).toBe(true);
    expect(isBlockedHost('169.254.0.1')).toBe(true);
  });

  it('blocks RFC1918 / private IPv4 ranges', () => {
    expect(isBlockedHost('10.0.0.1')).toBe(true);
    expect(isBlockedHost('172.16.5.4')).toBe(true);
    expect(isBlockedHost('172.31.255.255')).toBe(true);
    expect(isBlockedHost('192.168.1.1')).toBe(true);
    expect(isBlockedHost('0.0.0.0')).toBe(true);
  });

  it('blocks private / loopback IPv6 (ULA, link-local, mapped)', () => {
    expect(isBlockedHost('[fc00::1]')).toBe(true);
    expect(isBlockedHost('[fe80::1]')).toBe(true);
    expect(isBlockedHost('[::ffff:127.0.0.1]')).toBe(true);
    expect(isBlockedHost('[::ffff:10.0.0.1]')).toBe(true);
  });

  it('blocks IPv4-compatible IPv6 with a private embedded address', () => {
    // deprecated ::a.b.c.d form; new URL() normalizes to ::7f00:1 / ::a00:1
    expect(isBlockedHost('[::7f00:1]')).toBe(true); // 127.0.0.1
    expect(isBlockedHost('[::a00:1]')).toBe(true); // 10.0.0.1
    expect(isBlockedHost('[::c0a8:1]')).toBe(true); // 192.168.0.1
  });

  it('blocks NAT64 (64:ff9b::/96) tunnelling a private address', () => {
    expect(isBlockedHost('[64:ff9b::7f00:1]')).toBe(true); // 127.0.0.1
    expect(isBlockedHost('[64:ff9b::a00:1]')).toBe(true); // 10.0.0.1
  });

  it('does not block NAT64 / compatible forms carrying a public address', () => {
    expect(isBlockedHost('[64:ff9b::808:808]')).toBe(false); // 8.8.8.8
    expect(isBlockedHost('[::808:808]')).toBe(false); // 8.8.8.8
  });

  it('does not block ordinary public hosts', () => {
    expect(isBlockedHost('www.seeq.com')).toBe(false);
    expect(isBlockedHost('8.8.8.8')).toBe(false);
    expect(isBlockedHost('172.15.0.1')).toBe(false); // just outside 172.16/12
    expect(isBlockedHost('172.32.0.1')).toBe(false); // just above 172.16/12
    expect(isBlockedHost('example.com')).toBe(false);
  });
});

describe('assertPublicUrl', () => {
  it('accepts a normal public https url', () => {
    expect(() => assertPublicUrl('https://www.seeq.com/product')).not.toThrow();
  });

  it('throws BlockedUrlError for loopback', () => {
    expect(() => assertPublicUrl('http://localhost:6379/')).toThrow(BlockedUrlError);
    expect(() => assertPublicUrl('http://127.0.0.1/')).toThrow(BlockedUrlError);
  });

  it('throws for the trailing-dot loopback form', () => {
    expect(() => assertPublicUrl('http://localhost./')).toThrow(BlockedUrlError);
  });

  it('throws BlockedUrlError for the metadata endpoint', () => {
    expect(() => assertPublicUrl('http://169.254.169.254/latest/meta-data/')).toThrow(
      BlockedUrlError,
    );
  });

  it('catches IPv4-compatible and NAT64 loopback via URL normalization', () => {
    expect(() => assertPublicUrl('http://[::127.0.0.1]/')).toThrow(BlockedUrlError);
    expect(() => assertPublicUrl('http://[64:ff9b::127.0.0.1]/')).toThrow(BlockedUrlError);
  });

  it('catches decimal/hex-encoded loopback (URL normalizes the host)', () => {
    // 2130706433 === 127.0.0.1
    expect(() => assertPublicUrl('http://2130706433/')).toThrow(BlockedUrlError);
    expect(() => assertPublicUrl('http://0x7f.0.0.1/')).toThrow(BlockedUrlError);
  });
});
