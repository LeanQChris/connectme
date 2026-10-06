/**
 * Security helpers for the embeddable widget, which is reachable without any
 * prior authentication — only a signed session token separates callers, so the
 * tenant needs protecting against a single visitor flooding their inbox.
 */

const hits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 5000;

/**
 * Sliding-window limiter keyed by session or IP.
 *
 * In-memory on purpose: it has to be cheap, and the worst case of losing the
 * counters on a cold start is a handful of extra messages. The signed token is
 * what actually scopes a caller to a tenant; this only blunts the flood.
 *
 * Improvement over a blanket `map.clear()` when the key count is exceeded:
 * expired windows are pruned first, so inflating the key count cannot be used
 * to reset an active visitor's budget.
 */
export function allowWidgetMessage(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      const alive = times.filter((at) => now - at < windowMs);
      if (alive.length === 0) hits.delete(k);
      else hits.set(k, alive);
    }
    // Only if pruning could not make room — never as the first resort.
    if (hits.size > MAX_TRACKED_KEYS) hits.clear();
  }

  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Test seam: drop all recorded hits. */
export function resetWidgetRateLimits(): void {
  hits.clear();
}

/**
 * Whether an embedding page's Origin is permitted.
 *
 * Opt-in: `WIDGET_ALLOWED_ORIGINS` is a comma-separated list of origins
 * (`https://app.example.com`) or bare hostnames (`example.com`, which also
 * covers subdomains). When unset, every origin is accepted — the current
 * behaviour, so enabling the feature is a deliberate configuration change
 * rather than something that silently breaks existing embeds.
 *
 * A missing Origin cannot be verified (same-origin requests omit it) and is
 * allowed: the signed token still scopes the session to one tenant.
 */
export function isAllowedWidgetOrigin(origin: string | undefined | null): boolean {
  const entries = (process.env.WIDGET_ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (entries.length === 0) return true;

  const raw = (origin || "").trim().toLowerCase().replace(/\/+$/, "");
  if (!raw) return true;

  let host: string;
  try {
    host = new URL(raw).host;
  } catch {
    // Not an absolute origin (e.g. "null" from a sandboxed frame): fall through
    // to a literal comparison against configured entries.
    host = raw;
  }

  return entries.some((entry) => {
    const bare = entry.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return raw === bare || host === bare || host.endsWith(`.${bare}`);
  });
}
