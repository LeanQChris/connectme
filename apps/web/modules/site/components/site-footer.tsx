"use client";

import Link from "next/link";
import Logo from "@/components/ui/logo";

interface SiteFooterProps {
  userId?: string | null;
}

export function SiteFooter({ userId }: SiteFooterProps) {
  return (
    <footer className="border-t border-hairline px-4 py-7">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-[12px] text-mute">
          <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-hairline bg-primary text-on-primary">
            <Logo className="h-3 w-3" />
          </span>
          <span className="font-medium text-ink">ConnectMe</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-mute">
          {userId ? (
            <Link href="/inbox" className="transition-colors hover:text-ink">
              Inbox
            </Link>
          ) : (
            <Link href="/sign-in" className="transition-colors hover:text-ink">
              Sign in
            </Link>
          )}
          <Link href="/settings" className="transition-colors hover:text-ink">
            Settings
          </Link>
          <Link href="/about" className="transition-colors hover:text-ink">
            About
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
