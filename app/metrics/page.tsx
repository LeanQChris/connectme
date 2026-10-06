import Link from "next/link";

import UserMenu from "@/components/auth/user-menu";
import ThemeToggle from "@/components/inbox/theme-toggle";
import MetricsDashboard from "@/components/metrics/metrics-dashboard";
import { requireUserId } from "@/lib/tenant";

export const metadata = {
  title: "Metrics · ConnectMe",
};

export default async function MetricsPage() {
  const auth = await requireUserId();

  if (auth instanceof Response) {
    return <div className="min-h-[100dvh] bg-canvas" />;
  }

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
            ConnectMe Workspace Metrics
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <MetricsDashboard />
    </div>
  );
}
