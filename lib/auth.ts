import { SignJWT, jwtVerify } from "jose";

import { config, SESSION_COOKIE } from "./config";
import { safeEqual } from "./meta/verify";

export { SESSION_COOKIE };

/** Session lifetime. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Pure session and password helpers.
 *
 * Deliberately free of `next/headers` so proxy.ts can import it: the cookie is
 * read from the request there, and from `cookies()` in route handlers and pages.
 */

function secretKey(): Uint8Array {
  return new TextEncoder().encode(config.sessionSecret);
}

export function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function signSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/** Constant-time comparison against ADMIN_PASSWORD. */
export function verifyPassword(candidate: string): boolean {
  return safeEqual(candidate, config.adminPassword);
}