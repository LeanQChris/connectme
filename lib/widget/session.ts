/**
 * Website widget sessions.
 *
 * A visitor holds a signed token for one browser session; it names the tenant and
 * the session id, and nothing else. There is no cookie and no account, so the
 * signature is the only thing standing between a stranger and someone else's
 * inbox: the token is what every widget route re-checks, and it only ever grants
 * access to the one session it names.
 *
 * Server-only: imports node:crypto.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { config } from "../config";

/** 30 days, long enough that a returning visitor keeps their thread. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function key(): Buffer {
  return createHmac("sha256", config.encryptionKey).update("connectme-widget").digest();
}

export interface WidgetSession {
  userId: string;
  sid: string;
}

export function signWidgetSession(session: WidgetSession): string {
  const body = Buffer.from(
    JSON.stringify({ ...session, exp: Date.now() + TTL_MS }),
  ).toString("base64url");
  const sig = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** The session behind a `Bearer` token, or null when the token is absent, forged or expired. */
export function verifyWidgetSession(token: string | null): WidgetSession | null {
  if (!token) return null;

  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", key()).update(body).digest("base64url");
  const given = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      userId?: unknown;
      sid?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.userId !== "string" || typeof parsed.sid !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { userId: parsed.userId, sid: parsed.sid };
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

/* ---------------------------------------------------------------- rate limiting */

const hits = new Map<string, number[]>();

/**
 * Sliding-window limiter, per session and per IP.
 *
 * In-memory on purpose: it needs to be cheap, and the worst case of losing the
 * counters on a cold start is a handful of extra messages. The signed token is
 * what actually protects the tenant; this only blunts the flood.
 */
export function allowWidgetMessage(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  if (hits.size > 5000) hits.clear();

  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}