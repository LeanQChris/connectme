"use client";

import Link from "next/link";
import React, { useState } from "react";

import Logo from "@/components/ui/logo";
import { ChannelIcon } from "@/components/ui/channel-badge";
import ThemeToggle from "@/components/ui/theme-toggle";
import { ReplyWindow } from "@/modules/site/components/reply-window";
import { InboxPreview } from "@/modules/site/components/inbox-preview";
import { SignInCard } from "./components/sign-in-card";
import { cn } from "@/core/utils/cn";

export interface SignInModuleProps {
  redirectUrl: string;
  error?: string;
}

const CHANNELS = ["whatsapp", "messenger", "instagram", "telegram", "discord"] as const;
type LoginChannel = (typeof CHANNELS)[number];

const CHANNEL_TINT: Record<LoginChannel, string> = {
  whatsapp: "var(--spectrum-whatsapp)",
  messenger: "var(--spectrum-messenger)",
  instagram: "var(--spectrum-instagram)",
  telegram: "var(--spectrum-telegram)",
  discord: "var(--spectrum-discord)",
};

export default function SignInModule({ redirectUrl, error }: SignInModuleProps) {
  const [previewTab, setPreviewTab] = useState<"reply" | "inbox">("reply");

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-canvas text-ink">
      <div aria-hidden className="spectrum-wash pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--hairline)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"
      />

      {/* Top Header */}
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 border-b border-hairline/60 bg-canvas/60 backdrop-blur-md">
        <Link href="/" className="group flex items-center gap-2.5" title="ConnectMe home">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-hairline bg-primary text-on-primary shadow-xs transition-transform duration-150 group-hover:scale-105">
            <Logo className="h-4 w-4" />
          </span>
          <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
            ConnectMe
          </span>
          <span className="hidden rounded-[4px] border border-hairline bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mute sm:inline">
            Omnichannel Queue
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-8 items-center gap-1 rounded-[6px] border border-hairline bg-canvas px-2.5 text-[12px] font-medium text-mute transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
          >
            <span>&larr;</span>
            <span>Back to site</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Sign-In Center Container */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column: Form & Trust */}
          <div className="mx-auto w-full max-w-[420px] lg:mx-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas-elevated px-3 py-1 text-[11px] font-medium text-mute shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Secure Team Authentication
            </div>

            <h1 className="mt-4 text-balance text-[32px] font-semibold leading-[1.06] tracking-[-0.04em] text-ink sm:text-[40px]">
              One inbox, not five.
            </h1>

            <p className="mt-3.5 max-w-sm text-[14.5px] leading-relaxed text-body">
              Answer customer messages across WhatsApp, Messenger, Instagram, Telegram, and
              Discord in a unified, policy-aware queue.
            </p>

            <div className="mt-7">
              <SignInCard redirectUrl={redirectUrl} error={error} />
            </div>

            {/* Channels Pill Strip */}
            <div className="mt-6 flex items-center justify-center gap-2 lg:justify-start">
              <div className="flex items-center -space-x-1.5">
                {CHANNELS.map((channel) => (
                  <span
                    key={channel}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-canvas shadow-2xs"
                    style={{ background: CHANNEL_TINT[channel] }}
                    title={channel}
                  >
                    <ChannelIcon channel={channel} className="h-[11px] w-[11px]" />
                  </span>
                ))}
              </div>
              <span className="font-mono text-[11px] text-mute">
                5 supported channel networks
              </span>
            </div>

            {/* Terms and Privacy notice */}
            <p className="mt-6 text-center text-[11.5px] leading-relaxed text-mute lg:text-left">
              By continuing you agree to our{" "}
              <Link
                href="/terms"
                className="text-body underline underline-offset-2 hover:text-ink transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-body underline underline-offset-2 hover:text-ink transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {/* Right Column: Interactive Live Preview with Tab Switcher */}
          <div className="relative hidden lg:block">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[24px] bg-canvas-elevated/40 backdrop-blur-sm border border-hairline/40"
            />
            <div className="relative motion-safe:animate-[fade-up_0.55s_ease-out_both]">
              {/* Preview Mode Switcher */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex rounded-[6px] border border-hairline bg-canvas-elevated p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("reply")}
                    className={cn(
                      "rounded-[4px] px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                      previewTab === "reply"
                        ? "bg-primary text-on-primary"
                        : "text-mute hover:text-ink"
                    )}
                  >
                    24h Policy Window
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("inbox")}
                    className={cn(
                      "rounded-[4px] px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                      previewTab === "inbox"
                        ? "bg-primary text-on-primary"
                        : "text-mute hover:text-ink"
                    )}
                  >
                    Unified Queue
                  </button>
                </div>

                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Preview
                </span>
              </div>

              {previewTab === "reply" ? <ReplyWindow /> : <InboxPreview />}

              <div className="mt-4 flex items-center justify-between px-1">
                <p className="text-[12px] leading-relaxed text-mute">
                  {previewTab === "reply"
                    ? "Live 24h countdown on Meta customer threads prevents silent API drops."
                    : "Every customer thread indexed with channel tag and real-time status."}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  Real-time
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-mute sm:flex-row sm:px-6 border-t border-hairline/60 bg-canvas/40">
        <span>&copy; {new Date().getFullYear()} ConnectMe &middot; Omnichannel Team Inbox</span>
        <div className="flex items-center gap-4">
          <Link href="/about" className="transition-colors hover:text-ink">
            About &amp; Architecture
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-ink">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
