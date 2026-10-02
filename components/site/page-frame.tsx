import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import ThemeToggle from "@/components/inbox/theme-toggle";
import Logo from "@/components/logo";

/** Single place to change when a real contact address and jurisdiction are known. */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "support@connectme.app";

export async function PageFrame({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-hairline bg-canvas/80 px-4 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs">
            <Logo className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-semibold tracking-[-0.02em]">ConnectMe</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/about"
            className="hidden text-[12px] font-medium text-body transition-colors hover:text-ink sm:block"
          >
            About
          </Link>
          <Link
            href="/privacy"
            className="hidden text-[12px] font-medium text-body transition-colors hover:text-ink sm:block"
          >
            Privacy
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-hairline bg-canvas px-4 py-8 text-center">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-[12px] text-mute sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-hairline bg-primary text-on-primary text-[10px]">
              <Logo className="h-3 w-3" />
            </div>
            <span className="font-medium text-ink">ConnectMe</span>
            <span>— Meta Unified Gateway</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            {userId ? (
              <Link href="/inbox" className="transition-colors hover:text-ink">
                Inbox
              </Link>
            ) : (
              <Link href="/sign-in" className="transition-colors hover:text-ink">
                Sign in
              </Link>
            )}
            <span>·</span>
            <Link href="/about" className="transition-colors hover:text-ink">
              About
            </Link>
            <span>·</span>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/inbox" className="transition-colors hover:text-ink">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Heading + body rhythm shared by the About and Privacy pages. */
export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline pt-6">
      <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <div className="mt-2.5 space-y-3 text-[13.5px] leading-relaxed text-body">{children}</div>
    </section>
  );
}

export function DocList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
