/**
 * SSRF guard for the media proxy. Only hosts ConnectMe legitimately downloads
 * from are permitted: Meta/Graph lookaside hosts and the configured object
 * store. Everything else (including localhost, 169.254.169.254, RFC1918) is
 * rejected before any outbound request is made.
 */

const DEFAULT_ALLOWED_SUFFIXES = [
  "facebook.com",
  "fbcdn.net",
  "fbsbx.com",
  "whatsapp.net",
  "cdninstagram.com",
];

function hostnameAllowed(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function allowedMediaHosts(): string[] {
  const configured: string[] = [];
  const s3Base = process.env.S3_PUBLIC_BASE_URL;
  if (s3Base) {
    try {
      configured.push(new URL(s3Base).hostname);
    } catch {
      // ignore malformed configuration
    }
  }
  const extra = (process.env.MEDIA_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  return [...DEFAULT_ALLOWED_SUFFIXES, ...configured, ...extra];
}

export function isAllowedMediaHost(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }

  return hostnameAllowed(host, allowedMediaHosts());
}
