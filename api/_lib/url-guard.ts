// SSRF guard (issue #15): reject research URLs whose host is loopback,
// link-local, the cloud-metadata address, or a private range (RFC1918 / ULA).
// Pure + synchronous + dependency-free so it stays node-testable and `api/`
// needs no `@types/node`. It classifies the URL's already-normalized host
// literal — `new URL()` folds decimal/hex IPv4 (e.g. 2130706433 → 127.0.0.1)
// into dotted form, so those encodings are covered too.
//
// Residual risk (still tracked in issue #15): this does NOT resolve DNS, so a
// public hostname pointing at a private IP (DNS rebinding) is out of scope, and
// `fetch` follows redirects, so a public page can still 3xx to an internal host.
// Closing those needs a DNS lookup + manual redirect handling — deferred.

/** A URL rejected because its host is not a public address. */
export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedUrlError';
  }
}

/** Hostnames blocked by name regardless of resolution. */
const BLOCKED_HOSTNAMES = new Set(['localhost']);

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const a = octets[0];
  const b = octets[1];
  if (a === undefined || b === undefined) return false;

  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

/** Decode a "hi:lo" hextet pair (e.g. "7f00","1") into dotted IPv4. */
function hextetsToIpv4(hiHex: string, loHex: string): string {
  const hi = parseInt(hiHex, 16);
  const lo = parseInt(loHex, 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/**
 * Prefixes whose low 32 bits carry an embedded IPv4 that must be classified,
 * so a private target tunnelled through them is caught (defense-in-depth):
 *   `::ffff:`   IPv4-mapped
 *   `::`        IPv4-compatible (deprecated) — normalized `::7f00:1` etc.
 *   `64:ff9b::` NAT64 well-known prefix (/96)
 * Ordered most-specific first so `::ffff:` wins over the bare `::`.
 */
const EMBEDDED_IPV4_PREFIXES = ['::ffff:', '64:ff9b::', '::'];

function isBlockedIpv6(addr: string): boolean {
  const h = addr.toLowerCase();
  if (h === '::' || h === '::1') return true; // unspecified / loopback
  if (/^f[cd]/.test(h)) return true; // fc00::/7 unique-local
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local

  for (const prefix of EMBEDDED_IPV4_PREFIXES) {
    if (!h.startsWith(prefix)) continue;
    const tail = h.slice(prefix.length);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(tail)) return isBlockedIpv4(tail); // dotted
    const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/); // XXXX:YYYY
    if (hex && hex[1] && hex[2]) return isBlockedIpv4(hextetsToIpv4(hex[1], hex[2]));
  }
  return false;
}

/** True when a URL host literal is loopback / link-local / private / metadata. */
export function isBlockedHost(host: string): boolean {
  let h = host.trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1); // strip IPv6 brackets
  h = h.replace(/\.+$/, ''); // drop the FQDN root dot: `localhost.` resolves like `localhost`
  if (BLOCKED_HOSTNAMES.has(h) || h.endsWith('.localhost')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return isBlockedIpv4(h);
  if (h.includes(':')) return isBlockedIpv6(h);
  return false;
}

/** Throw BlockedUrlError if the URL targets a non-public host. */
export function assertPublicUrl(rawUrl: string): void {
  let host: string;
  try {
    host = new URL(rawUrl).hostname;
  } catch {
    throw new BlockedUrlError('URL could not be parsed');
  }
  if (isBlockedHost(host)) {
    throw new BlockedUrlError(`URL host "${host}" is not allowed`);
  }
}
