import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Auth gate for the whole app.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`. It runs on the Node.js runtime
 * and cannot run its own `runtime` config.
 *
 * Public paths: / (home page), /login, /api/login, and /api/webhook.
 */
const PUBLIC_PATHS = ["/", "/login", "/api/login", "/api/webhook", "/api/telegram", "/api/media"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((path) => path !== "/" && (pathname === path || pathname.startsWith(`${path}/`)));
}


export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  // API callers get JSON; pages get sent to the login screen.
  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip static assets and anything with a file extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};