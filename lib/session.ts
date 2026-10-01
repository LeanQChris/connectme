import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionToken } from "./auth";

/**
 * Request-scoped session helpers for route handlers and server components.
 * Kept separate from lib/auth.ts because proxy.ts cannot use `next/headers`.
 */

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function isAuthenticated(): Promise<boolean> {
  return verifySessionToken(await getSessionToken());
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Guard for route handlers. Proxy already blocks unauthenticated calls, but the
 * route must not trust that on its own.
 */
export async function requireSession(): Promise<Response | null> {
  return (await isAuthenticated()) ? null : unauthorized();
}