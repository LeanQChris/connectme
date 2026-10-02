import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import GoogleSignInButton from "@/components/auth/google-sign-in-button";
import ThemeToggle from "@/components/inbox/theme-toggle";
import Logo from "@/components/logo";

export const metadata = {
  title: "Sign in · ConnectMe",
};

/**
 * Google is the only strategy, so this one route covers sign-up too: Clerk creates
 * the account on the first successful handshake, no separate form exists.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect_url?: string }>;
}) {
  const { error, redirect_url: requested } = await searchParams;

  // Same-origin paths only, so the query string can never bounce off-site.
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/inbox";

  const { userId } = await auth();
  if (userId) redirect(next);

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <div className="mesh-gradient pointer-events-none absolute inset-0 opacity-70 dark:opacity-40" />

      <header className="relative z-10 flex h-12 items-center justify-between border-b border-hairline bg-canvas/80 px-4 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs">
            <Logo className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-semibold tracking-[-0.02em]">ConnectMe</span>
        </Link>

        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-[360px] rounded-[12px] border border-hairline bg-canvas-elevated p-7 shadow-[0px_1px_1px_rgba(0,0,0,0.05),0px_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0px_1px_1px_rgba(255,255,255,0.05),0px_20px_50px_rgba(255,255,255,0.5)]">
          <h1 className="text-[20px] font-semibold tracking-[-0.03em]">Sign in to ConnectMe</h1>
          <p className="mt-1.5 text-[13px] text-body">
            One click with Google opens your unified inbox.
          </p>

          {error && (
            <p className="mt-4 rounded-[6px] border border-hairline bg-surface-well px-3 py-2 text-[12px] text-error">
              Sign-in failed (<span className="font-mono">{error}</span>). Please try again.
            </p>
          )}

          <div className="mt-6">
            <GoogleSignInButton redirectUrl={next} />
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-mute">
            New accounts are created automatically on first sign-in.
          </p>
        </div>
      </main>
    </div>
  );
}
