import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

/** Failed attempts per client before the client is blocked. */
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
/** Artificial delay after a wrong password, to slow guessing down. */
const FAILURE_DELAY_MS = 750;

interface AttemptState {
  count: number;
  resetAt: number;
}

/**
 * In-memory throttle. Good enough for a single-instance internal tool; move it
 * to Redis (or similar) before running more than one instance.
 */
const attempts = new Map<string, AttemptState>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

function isBlocked(key: string): boolean {
  const state = attempts.get(key);
  if (!state) return false;
  if (Date.now() > state.resetAt) {
    attempts.delete(key);
    return false;
  }
  return state.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const existing = attempts.get(key);
  if (!existing || Date.now() > existing.resetAt) {
    attempts.set(key, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
    return;
  }
  existing.count += 1;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request): Promise<Response> {
  const key = clientKey(request);
  if (isBlocked(key)) {
    return Response.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!password) return Response.json({ error: "Password is required" }, { status: 400 });

  if (!verifyPassword(password)) {
    recordFailure(key);
    console.warn(`[auth] failed login attempt from ${key}`);
    await sleep(FAILURE_DELAY_MS);
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  attempts.delete(key);

  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(), sessionCookieOptions());

  return Response.json({ ok: true });
}