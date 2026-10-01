import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Auth gate for the whole app.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`. It runs on the Node.js runtime
 * and cannot run its own `runtime` config.
 *
 * Public paths: /login, /api/login (to log in) and /api/webhook (Meta calls it
 * and it authenticates itself with the X-Hub-Signature-256 header).
 */
const PUBLIC_PATHS = ["/login", "/api/login", "/api/webhook"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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