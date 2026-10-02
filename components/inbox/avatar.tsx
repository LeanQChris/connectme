"use client";

import { useState } from "react";
import type { Channel } from "@/lib/types";

import { ChannelIcon, channelMeta } from "./channel-badge";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  channel?: Channel;
  size?: "sm" | "md" | "lg";
  className?: string;
  showChannelBadge?: boolean;
}

// Sophisticated Geist subtle dark/light tones for fallbacks
const INITIAL_BGS = [
  "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900",
  "bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900",
  "bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900",
  "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900",
  "bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950",
];

function getInitialBg(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % INITIAL_BGS.length;
  return INITIAL_BGS[index];
}

function getInitials(name: string): string {
  if (!name) return "?";
  if (/^\d+$/.test(name)) {
    return "#" + name.slice(-2);
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  avatarUrl,
  channel,
  size = "md",
  className = "",
  showChannelBadge = true,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 text-[11px]",
    md: "w-9 h-9 text-[12px]",
    lg: "w-11 h-11 text-[14px]",
  }[size];

  const badgeSizeClasses = {
    sm: "w-3 h-3 -bottom-0.5 -right-0.5",
    md: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    lg: "w-4 h-4 bottom-0 right-0",
  }[size];

  const initials = getInitials(name);
  const fallbackBg = getInitialBg(name || "default");
  const hasValidImage = avatarUrl && !imgError;

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <div
        className={`${sizeClasses} relative flex items-center justify-center overflow-hidden rounded-full border border-hairline bg-canvas-elevated shadow-[0px_1px_1px_rgba(0,0,0,0.05)]`}
      >
        {hasValidImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${fallbackBg} font-mono font-medium tracking-tight`}
          >
            {initials}
          </div>
        )}
      </div>

      {showChannelBadge && channel && (
        <div
          className={`absolute ${badgeSizeClasses} flex items-center justify-center rounded-full ring-2 ring-[var(--canvas)] ${channelMeta(channel).tile} text-white`}
          title={channelMeta(channel).label}
        >
          <ChannelIcon channel={channel} className="h-[62%] w-[62%]" />
        </div>
      )}
    </div>
  );
}

