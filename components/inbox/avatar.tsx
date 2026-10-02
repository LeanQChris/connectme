"use client";

import { useState } from "react";
import type { Channel } from "@/lib/types";

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
          className={`absolute ${badgeSizeClasses} flex items-center justify-center rounded-full ring-2 ring-[var(--canvas)] ${
            channel === "messenger"
              ? "bg-[#0084FF] text-white"
              : channel === "whatsapp"
                ? "bg-[#25D366] text-white"
                : "bg-pink-500 text-white"
          }`}
          title={channel === "messenger" ? "Messenger" : "WhatsApp"}
        >
          {channel === "messenger" ? (
            <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.734 7.218V22l3.39-1.86c.928.257 1.91.396 2.876.396 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.463-2.73-2.91-5.328 2.91 5.86-6.222 2.798 2.91 5.26-2.91-5.86 6.222z" />
            </svg>
          ) : (
            <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

