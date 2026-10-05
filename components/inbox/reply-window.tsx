"use client";

import { useEffect, useState } from "react";
import { REPLY_WINDOW_MS } from "@/lib/window";

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatLeft(msLeft: number): string {
  const totalMinutes = Math.max(0, Math.floor(msLeft / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`;
}

export default function ReplyWindowBar({
  lastInboundAt,
  channel,
}: {
  lastInboundAt: string | null;
  channel?: string;
}) {
  const now = useNow(1000);
  const [showInfo, setShowInfo] = useState(false);

  if (channel === "telegram" || channel === "discord") {
    const isDiscord = channel === "discord";
    const brandColor = isDiscord ? "bg-[#5865F2]" : "bg-sky-500";
    const name = isDiscord ? "Discord" : "Telegram";

    return (
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-hairline bg-canvas-elevated/70 px-3.5 text-[11px] backdrop-blur-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={`relative inline-flex h-2 w-2 rounded-full ${brandColor}`} />
          </span>
          <span className="font-medium text-ink truncate">
            Unlimited Messaging Active
          </span>
          <span className="hidden sm:inline text-mute">· {name} bots have no 24h limit</span>
        </div>

        <span className="font-mono text-[10.5px] font-medium text-mute shrink-0">
          No time limit
        </span>
      </div>
    );
  }

  const msLeft = lastInboundAt
    ? REPLY_WINDOW_MS - (now - new Date(lastInboundAt).getTime())
    : REPLY_WINDOW_MS;
  const open = msLeft > 0;
  const percent = Math.max(0, Math.min(100, (msLeft / REPLY_WINDOW_MS) * 100));
  const urgent = open && percent <= 25;

  return (
    <div className="relative flex h-9 shrink-0 items-center justify-between border-b border-hairline bg-canvas-elevated/70 px-3 sm:px-4 text-[11px] backdrop-blur-xs select-none">
      {/* Left: Status indicator */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          {open && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                urgent ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              open ? (urgent ? "bg-amber-500" : "bg-emerald-500") : "bg-error"
            }`}
          />
        </span>

        <span
          className={`font-medium truncate ${
            open ? (urgent ? "text-amber-600 dark:text-amber-400" : "text-ink") : "text-error"
          }`}
        >
          {open ? "24h Window Active" : "24h Window Closed"}
        </span>

        {/* Info button with popover */}
        <div className="relative inline-flex items-center">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            aria-label="Meta 24-hour rule info"
            className="text-mute hover:text-ink transition-colors p-0.5 rounded cursor-pointer"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
              <path strokeWidth="1.8" strokeLinecap="round" d="M12 16v-4m0-4h.01" />
            </svg>
          </button>

          {showInfo && (
            <div className="absolute left-0 top-6 z-30 w-72 rounded-[8px] border border-hairline bg-canvas-elevated p-2.5 text-[11px] text-body shadow-xl leading-relaxed backdrop-blur-md">
              <p className="font-semibold text-ink mb-1">Meta 24-Hour Policy</p>
              <p>
                {open
                  ? "You can send free-form replies within 24 hours of the customer's last message. After 24 hours, only approved Meta templates can be sent."
                  : "The 24-hour reply window has expired. Wait for the customer to message you again or send an approved template."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Remaining time pill & mini progress bar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface-well px-2.5 py-0.5 font-mono text-[10.5px] tabular-nums">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-hairline">
            <div
              className={`h-full transition-[width] duration-1000 ease-linear ${
                !open ? "bg-error" : urgent ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className={open ? (urgent ? "text-amber-600 dark:text-amber-400 font-medium" : "text-body") : "text-error font-medium"}>
            {open ? formatLeft(msLeft) : "Expired"}
          </span>
        </div>
      </div>
    </div>
  );
}