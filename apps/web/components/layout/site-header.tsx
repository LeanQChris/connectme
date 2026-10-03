"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

import UserMenu from "@/modules/auth/components/user-menu";
import ThemeToggle from "@/components/ui/theme-toggle";
import Logo from "@/components/ui/logo";

export interface SiteHeaderProps {
  variant?: "public" | "auth";
}

const NAV_LINKS = [
  { label: "Channels", href: "/#channels" },
  { label: "How it works", href: "/#setup" },
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
];

export default function SiteHeader({ variant = "public" }: SiteHeaderProps) {
  const { userId } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas/80 px-4 sm:px-6 backdrop-blur-md">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs transition-transform duration-150 group-hover:scale-105">
            <Logo className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">ConnectMe</span>
        </Link>
        <span className="hidden rounded-[4px] border border-hairline bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mute sm:inline">
          Unified inbox
        </span>
      </div>

      {/* Primary Navigation */}
      <nav className="hidden items-center gap-5 text-[12px] font-medium text-body md:flex">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="transition-colors hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right Controls & Auth State */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <ThemeToggle />

        {variant === "auth" ? (
          <Link
            href="/"
            className="flex h-8 items-center rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 sm:px-3 text-[12px] font-medium text-ink shadow-2xs transition-colors hover:bg-surface-well"
          >
            ← Home
          </Link>
        ) : userId ? (
          <>
            <Link
              href="/dashboard"
              className="hidden h-8 items-center rounded-[6px] border border-hairline bg-canvas-elevated px-3 text-[12px] font-medium text-ink shadow-2xs transition-colors hover:bg-surface-well sm:flex"
            >
              Dashboard
            </Link>
            <Link
              href="/inbox"
              className="flex h-8 items-center rounded-[6px] bg-primary px-3 text-[12px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
            >
              Open inbox
            </Link>
            <UserMenu />
          </>
        ) : (
          <Link
            href="/sign-in"
            className="flex h-8 items-center rounded-[6px] bg-primary px-3 text-[12px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
