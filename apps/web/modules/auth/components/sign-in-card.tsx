"use client";

import Link from "next/link";
import GoogleSignInButton from "./google-sign-in-button";
import { ChannelIcon } from "@/components/ui/channel-badge";
import type { Channel } from "@/core/types";

interface SignInCardProps {
  redirectUrl: string;
  error?: string;
}

const CHANNELS: {
  id: Channel;
  name: string;
  badge: string;
  textColor: string;
  borderColor: string;
}[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    textColor: "text-whatsapp",
    borderColor: "border-emerald-500/30",
  },
  {
    id: "messenger",
    name: "Messenger",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    textColor: "text-messenger",
    borderColor: "border-blue-500/30",
  },
  {
    id: "instagram",
    name: "Instagram",
    badge: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    textColor: "text-pink-500",
    borderColor: "border-pink-500/30",
  },
  {
    id: "telegram",
    name: "Telegram",
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    textColor: "text-sky-500",
    borderColor: "border-sky-500/30",
  },
  {
    id: "discord",
    name: "Discord",
    badge: "bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20",
    textColor: "text-[#5865F2]",
    borderColor: "border-[#5865F2]/30",
  },
];

export function SignInCard({ redirectUrl, error }: SignInCardProps) {
  return (
    <div className="flex flex-col lg:col-span-5">
      <div className="w-full rounded-2xl border border-hairline bg-canvas-elevated/90 p-6 sm:p-8 backdrop-blur-xl shadow-[0px_4px_24px_rgba(0,0,0,0.06),0px_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0px_4px_32px_rgba(0,0,0,0.4)]">
        {/* Status indicator eyebrow */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Omnichannel Hub
            </span>
          </div>
          <span className="text-[12px] text-mute">Clerk SSO Ready</span>
        </div>

        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
          Sign in to ConnectMe
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-body">
          One click connects your Google account directly to your unified workspace. No passwords, no credit card required.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-error flex items-start gap-2.5">
            <span className="font-bold">Error:</span>
            <span>Sign-in failed ({error}). Please verify your Google account and try again.</span>
          </div>
        )}

        {/* Primary Action Button */}
        <div className="mt-6">
          <GoogleSignInButton redirectUrl={redirectUrl} />
        </div>

        {/* Micro reassurance message */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-mute">
          <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>New accounts are created automatically on first login.</span>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-hairline" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-canvas-elevated px-2 font-mono text-[11px] uppercase tracking-wider text-mute">
              Unified Channels Included
            </span>
          </div>
        </div>

        {/* Supported Channels Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {CHANNELS.map((c) => (
            <div
              key={c.id}
              className="group flex flex-1 min-w-[54px] flex-col items-center justify-center gap-1 rounded-lg border border-hairline bg-surface-well/50 py-2 px-1 transition-all duration-200 hover:border-hairline-strong hover:bg-surface-well"
              title={c.name}
            >
              <ChannelIcon channel={c.id} className={`h-4 w-4 ${c.textColor}`} />
              <span className="text-[10px] font-medium text-body tracking-tight">{c.name}</span>
            </div>
          ))}
        </div>

        {/* Security and compliance badges */}
        <div className="mt-6 pt-5 border-t border-hairline/80 flex items-center justify-between text-[11px] text-mute">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-mute" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            256-bit TLS Encrypted
          </span>
          <span className="font-mono text-[11px] text-mute">Meta Verified</span>
        </div>
      </div>

      {/* Bottom links */}
      <div className="mt-4 flex items-center justify-between px-2 text-[12px] text-mute">
        <Link href="/" className="hover:text-ink transition-colors">
          ← Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="hover:text-ink transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/about" className="hover:text-ink transition-colors">
            About ConnectMe
          </Link>
        </div>
      </div>
    </div>
  );
}
