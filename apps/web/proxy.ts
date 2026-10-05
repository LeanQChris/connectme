import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Auth gate for the whole app.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`. It runs on the Node.js runtime
 * and cannot run its own `runtime` config.
 *
 * Public: the landing page, the custom /sign-in screen, the About and Privacy
 * pages, provider webhooks (authenticated by signature), and the Meta OAuth
 * callback (authenticated by a signed, single-use state parameter).
 */
function isPublic(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname === "/about" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname.startsWith("/api/webhook") ||
    pathname === "/api/auth/meta/callback"
  );
}

export default clerkMiddleware(async (auth, request) => {
  if (isPublic(request.nextUrl.pathname)) return;

  const { userId, getToken } = await auth();
  if (userId) {
    const requestHeaders = new Headers(request.headers);
    // Forward the Clerk session token so the API can verify it independently.
    // The API never trusts the `x-tenant-id` header.
    const token = await getToken();
    if (token) {
      requestHeaders.set("authorization", `Bearer ${token}`);
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // API callers get JSON; pages get sent to the custom Google sign-in screen.
  // NextResponse is required here: a static Response has immutable headers,
  // which Clerk cannot append its own headers to.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signIn = new URL("/sign-in", request.url);
  // Path only: the sign-in screen reads it back as a same-origin destination.
  signIn.searchParams.set(
    "redirect_url",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(signIn);
});

export const config = {
  // Skip static assets and anything with a file extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
