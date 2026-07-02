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

  it('catches decimal/hex-encoded loopback (URL normalizes the host)', () => {
    // 2130706433 === 127.0.0.1
    expect(() => assertPublicUrl('http://2130706433/')).toThrow(BlockedUrlError);
    expect(() => assertPublicUrl('http://0x7f.0.0.1/')).toThrow(BlockedUrlError);
  });
});
