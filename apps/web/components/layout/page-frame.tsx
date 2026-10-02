import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import Logo from "@/components/ui/logo";
import SiteHeader from "@/components/layout/site-header";

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "support@connectme.app";

export async function PageFrame({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <SiteHeader />

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
