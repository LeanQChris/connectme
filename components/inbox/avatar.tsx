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

const GRADIENTS = [
  "from-blue-600 to-indigo-600",
  "from-violet-600 to-purple-600",
  "from-emerald-500 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
];

function getGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

function getInitials(name: string): string {
  if (!name) return "?";
  // If it's purely digits / phone / PSID
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
    md: "w-10 h-10 text-[13px]",
    lg: "w-12 h-12 text-[15px]",
  }[size];

  const badgeSizeClasses = {
    sm: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    md: "w-4 h-4 -bottom-0.5 -right-0.5",
    lg: "w-5 h-5 bottom-0 right-0",
  }[size];

  const initials = getInitials(name);
  const gradient = getGradient(name || "default");
  const hasValidImage = avatarUrl && !imgError;

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <div
        className={`${sizeClasses} relative flex items-center justify-center overflow-hidden rounded-full font-semibold shadow-xs ring-1 ring-white/10`}
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
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} font-sans font-medium text-white shadow-inner`}
          >
            {initials}
          </div>
        )}
      </div>

      {showChannelBadge && channel && (
        <div
          className={`absolute ${badgeSizeClasses} flex items-center justify-center rounded-full ring-2 ring-[var(--bg)] ${
            channel === "messenger"
              ? "bg-[#0084FF] text-white"
              : channel === "whatsapp"
                ? "bg-[#25D366] text-white"
                : "bg-pink-500 text-white"
          }`}
          title={channel === "messenger" ? "Facebook Messenger" : "WhatsApp"}
        >
          {channel === "messenger" ? (
            <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.734 7.218V22l3.39-1.86c.928.257 1.91.396 2.876.396 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.463-2.73-2.91-5.328 2.91 5.86-6.222 2.798 2.91 5.26-2.91-5.86 6.222z" />
            </svg>
          ) : (
            <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
