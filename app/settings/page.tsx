import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";

import UserMenu from "@/components/auth/user-menu";
import ThemeToggle from "@/components/inbox/theme-toggle";
import SettingsForm from "@/components/settings/settings-form";
import { requireUserId, settingsPayload } from "@/lib/tenant";

export const metadata = {
  title: "Settings · ConnectMe",
};

export default async function SettingsPage() {
  const [auth, headerList] = await Promise.all([requireUserId(), headers()]);

  if (auth instanceof Response) {
    return <div className="min-h-[100dvh] bg-canvas" />;
  }

  const origin = headerList.get("origin") ?? `https://${headerList.get("host")}`;
  // Rendered on the server so the form arrives filled in — no client-side
  // fetch, no loading flash on load or hard reload.
  const initial = await settingsPayload(auth.userId, origin);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-hairline bg-canvas/80 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="flex items-center gap-2 rounded-md border border-hairline bg-canvas-elevated px-2.5 py-1 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to inbox</span>
          </Link>

          <span className="hidden h-3.5 w-px bg-hairline sm:block" />

          <span className="hidden font-mono text-[11px] text-mute sm:inline">
            ConnectMe Workspace Configuration
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <Suspense fallback={<div className="mx-auto max-w-3xl p-8 text-center text-mute">Loading settings…</div>}>
        <SettingsForm initial={initial} />
      </Suspense>
    </div>
  );
}
