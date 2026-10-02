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
                : channel === "telegram"
                  ? "bg-[#229ED9] text-white"
                  : "bg-pink-500 text-white"
          }`}
          title={channel === "messenger" ? "Messenger" : channel === "whatsapp" ? "WhatsApp" : channel === "telegram" ? "Telegram" : "Instagram"}
        >
          {channel === "messenger" ? (
            <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.734 7.218V22l3.39-1.86c.928.257 1.91.396 2.876.396 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.463-2.73-2.91-5.328 2.91 5.86-6.222 2.798 2.91 5.26-2.91-5.86 6.222z" />
            </svg>
          ) : channel === "whatsapp" ? (
            <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z" />
            </svg>
          ) : channel === "telegram" ? (
            <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.11-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.18-.04.32z" />
            </svg>
          ) : (
            <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

