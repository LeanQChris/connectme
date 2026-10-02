import Link from "next/link";
import { headers } from "next/headers";

import UserMenu from "@/components/auth/user-menu";
import SettingsForm from "@/components/settings/settings-form";
import { ensureTenantUser } from "@/lib/tenant";

export const metadata = {
  title: "Settings · ConnectMe",
};

export default async function SettingsPage() {
  const [tenant, headerList] = await Promise.all([ensureTenantUser(), headers()]);
  const origin = headerList.get("origin") ?? `https://${headerList.get("host")}`;

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <header className="flex h-12 items-center justify-between border-b border-hairline bg-canvas px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="flex items-center gap-2 text-[13px] font-medium text-body transition-colors hover:text-ink"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to inbox
          </Link>

          {tenant?.email && (
            <>
              <span className="h-3.5 w-px bg-hairline" />
              <span className="hidden font-mono text-[11px] text-mute sm:inline">{tenant.email}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mute">Settings</span>
          <UserMenu />
        </div>
      </header>

      <SettingsForm origin={origin} />
    </div>
  );
}
