"use client";

import Link from "next/link";
import Logo from "@/components/ui/logo";
import ThemeToggle from "@/components/ui/theme-toggle";
import UserMenu from "@/modules/auth/components/user-menu";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";

interface InboxHeaderProps {
  onBackToRoot: () => void;
}

export function InboxHeader({ onBackToRoot }: InboxHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackToRoot}
          className="group flex items-center gap-2.5 cursor-pointer select-none text-left"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs">
            <Logo className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
              ConnectMe
            </span>
            <span className="rounded-[4px] border border-hairline bg-surface-well px-1.5 py-0.2 font-mono text-[9.5px] uppercase tracking-wider text-mute">
              Unified Gateway
            </span>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <PwaInstallButton variant="badge" />
        <ThemeToggle />

        <Link
          href="/dashboard"
          className="flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
        >
          <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z"
            />
          </svg>
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <Link
          href="/scheduled"
          className="flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
        >
          <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="hidden sm:inline">Scheduled</span>
        </Link>

        <Link
          href="/settings"
          className="flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
        >
          <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            />
          </svg>
          <span className="hidden sm:inline">Settings</span>
        </Link>

        <UserMenu />
      </div>
    </header>
  );
}
