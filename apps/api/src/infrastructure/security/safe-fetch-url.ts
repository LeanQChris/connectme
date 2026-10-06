import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for endpoints that must fetch *arbitrary public* URLs.
 *
 * `allowed-media-hosts.ts` is an allowlist and therefore useless here: a link
 * preview has to reach any website a customer pasted. So this is the inverse —
 * resolve the target and refuse anything that lands on non-routable space.
 *
 * Resolving rather than pattern-matching the hostname matters for two bypasses
 * that a naive `127.`/`10.` check misses:
 *   - integer and hex shorthand (`http://2130706433/`, `http://0x7f000001/`),
 *     which getaddrinfo normalises to 127.0.0.1;
 *   - hostnames whose DNS answer points at internal addresses.
 *
 * Residual risk: resolution here and resolution inside `fetch` are two separate
 * lookups, so a record flipped between them (DNS rebinding) can still slip
 * through. Closing that requires pinning the socket to the checked address,
 * which needs a custom undici dispatcher.
 */

/** Dotted-quad IPv4, judged per range. */
function isPublicIpv4(ip: string): boolean {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = octets;

  if (a === 0) return false; // 0.0.0.0/8 — "this network"
  if (a === 10) return false; // 10.0.0.0/8 — private
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local, incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12 — private
  if (a === 192 && b === 168) return false; // 192.168.0.0/16 — private
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 — CGNAT
  if (a === 192 && b === 0) return false; // 192.0.0.0/24 — IETF protocol assignments
  if (a === 198 && (b === 18 || b === 19)) return false; // 198.18.0.0/15 — benchmarking
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

/**
 * Global unicast lives in 2000::/3. Everything outside it — unspecified `::`,
 * loopback `::1`, unique-local fc00::/7, link-local fe80::/10, multicast
 * ff00::/8 — is not public space, so the prefix test alone is sufficient and
 * fails closed for forms we do not recognise.
 */
function isPublicIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");

  // IPv4-mapped ::ffff:a.b.c.d — judge the embedded v4 address.
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPublicIpv4(mapped[1]);

  return normalized.startsWith("2") || normalized.startsWith("3");
}

/** True only for a globally routable address. Anything unknown is rejected. */
export function isPublicIp(rawIp: string): boolean {
  const ip = rawIp.replace(/^\[|\]$/g, "");
  const version = isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (version === 6) return isPublicIpv6(ip);
  return false;
}

/**
 * Whether `rawUrl` is safe for the server to fetch on a caller's behalf.
 *
 * Fails closed: an unparseable URL, a non-http scheme, embedded credentials, a
 * hostname that does not resolve, or a single non-public answer all reject the
 * request.
 */
export async function isSafePublicUrl(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  // credentials in a URL are never legitimate here and only confuse logging.
  if (url.username || url.password) return false;

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.$/, "");
  if (!hostname) return false;

  // Cheap short-circuit before any DNS work.
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    return false; // unresolvable: the fetch itself would fail anyway
  }

  if (addresses.length === 0) return false;
  // Every answer must be public: a record with both a public and a private A
  // record would otherwise be a coin flip.
  return addresses.every((entry) => isPublicIp(entry.address));
}
