"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import UserMenu from "@/modules/auth/components/user-menu";
import ThemeToggle from "@/components/ui/theme-toggle";
import Logo from "@/components/ui/logo";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { cn } from "@/core/utils/cn";

export interface SiteHeaderProps {
  variant?: "public" | "auth" | "app";
  onLogoClick?: () => void;
  subHeaderRight?: React.ReactNode;
}

const PUBLIC_NAV_LINKS = [
  { label: "Channels", href: "/#channels" },
  { label: "How it works", href: "/#setup" },
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
];

interface AppNavItem {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  icon: React.ReactNode;
}

const APP_NAV_ITEMS: AppNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    isActive: (pathname: string) => pathname.startsWith("/dashboard"),
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z"
        />
      </svg>
    ),
  },
  {
    label: "Inbox",
    href: "/inbox",
    isActive: (pathname: string) =>
      pathname.startsWith("/inbox") || pathname.startsWith("/conversations"),
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    label: "Scheduled",
    href: "/scheduled",
    isActive: (pathname: string) => pathname.startsWith("/scheduled"),
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    isActive: (pathname: string) => pathname.startsWith("/settings"),
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

export default function SiteHeader({
  variant,
  onLogoClick,
  subHeaderRight,
}: SiteHeaderProps) {
  const { userId } = useAuth();
  const pathname = usePathname() || "/";

  const resolvedVariant =
    variant ??
    (pathname === "/sign-in"
      ? "auth"
      : pathname.startsWith("/dashboard") ||
          pathname.startsWith("/inbox") ||
          pathname.startsWith("/conversations") ||
          pathname.startsWith("/scheduled") ||
          pathname.startsWith("/settings")
        ? "app"
        : "public");

  return (
    <div className="sticky top-0 z-50 flex flex-col shrink-0">
      {/* Primary Top Navbar */}
      <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas/80 px-4 sm:px-6 backdrop-blur-md">
        {/* Brand Identity - Always navigates to home/landing page */}
        <div className="flex items-center gap-2.5">
          {onLogoClick ? (
            <button
              type="button"
              onClick={onLogoClick}
              className="group flex items-center gap-2.5 cursor-pointer select-none text-left"
              title="ConnectMe"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs transition-transform duration-150 group-hover:scale-105">
                <Logo className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
                ConnectMe
              </span>
            </button>
          ) : (
            <Link
              href="/"
              className="group flex items-center gap-2.5"
              title="Go to ConnectMe Home"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs transition-transform duration-150 group-hover:scale-105">
                <Logo className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
                ConnectMe
              </span>
            </Link>
          )}

          <span className="hidden rounded-[4px] border border-hairline bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mute sm:inline">
            {resolvedVariant === "app" ? "Unified Gateway" : "Unified inbox"}
          </span>
        </div>

        {/* Public Marketing Navigation */}
        {resolvedVariant === "public" && (
          <nav className="hidden items-center gap-5 text-[12px] font-medium text-body md:flex">
            {PUBLIC_NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right Controls & Auth State */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {resolvedVariant === "app" && (
            <>
              <Link
                href="/"
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-mute transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
                title="View public website"
              >
                <span>Website</span>
                <svg
                  className="h-3 w-3 stroke-current opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
              <PwaInstallButton variant="badge" />
            </>
          )}

          <ThemeToggle />

          {resolvedVariant === "auth" ? (
            <Link
              href="/"
              className="flex h-8 items-center rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 sm:px-3 text-[12px] font-medium text-ink shadow-2xs transition-colors hover:bg-surface-well"
            >
              ← Home
            </Link>
          ) : userId ? (
            <>
              {resolvedVariant === "public" && (
                <Link
                  href="/dashboard"
                  className="flex h-8 items-center rounded-[6px] bg-primary px-3 text-[12px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90"
                >
                  Dashboard
                </Link>
              )}
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

      {/* User Sub-Header Navigation */}
      {resolvedVariant === "app" && (
        <nav
          aria-label="Workspace navigation"
          className="relative z-10 flex h-10 shrink-0 items-center justify-between border-b border-hairline bg-canvas/90 px-4 sm:px-6 backdrop-blur-md"
        >
          <div className="flex h-full items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            {APP_NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex h-full items-center gap-1.5 px-2.5 sm:px-3 text-[12.5px] font-medium transition-colors select-none",
                    active
                      ? "text-ink font-semibold"
                      : "text-mute hover:text-ink",
                  )}
                >
                  <span className={cn("transition-colors", active ? "text-ink" : "text-mute")}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-ink" />
                  )}
                </Link>
              );
            })}
          </div>

          {subHeaderRight && (
            <div className="flex items-center gap-2">{subHeaderRight}</div>
          )}
        </nav>
      )}
    </div>
  );
}
