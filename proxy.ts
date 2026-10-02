import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Auth gate for the whole app.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`. It runs on the Node.js runtime
 * and cannot run its own `runtime` config.
 *
 * Public: the landing page, Clerk's own routes, provider webhooks and the media
 * proxy (those authenticate by signature, or serve already-uploaded files).
 */
function isPublic(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/media")
  );
}

export default clerkMiddleware(async (auth, request) => {
  if (isPublic(request.nextUrl.pathname)) return;

  const { userId } = await auth();
  if (userId) return;

  // API callers get JSON; pages get sent to the Clerk sign-in screen.
  // NextResponse is required here: a static Response has immutable headers,
  // which Clerk cannot append its own headers to.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("redirect_url", request.url);
  return NextResponse.redirect(signIn);
});

export const config = {
  // Skip static assets and anything with a file extension.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
