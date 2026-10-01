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
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

/**
 * The reply window is the one thing on this screen that expires, so it is the
 * one thing that gets a live clock and a depleting bar. Everything else in the
 * header stays quiet.
 */
export default function ReplyWindowBar({ lastInboundAt }: { lastInboundAt: string | null }) {
  const now = useNow(1000);

  const msLeft = lastInboundAt
    ? REPLY_WINDOW_MS - (now - new Date(lastInboundAt).getTime())
    : REPLY_WINDOW_MS;
  const open = msLeft > 0;
  const percent = Math.max(0, Math.min(100, (msLeft / REPLY_WINDOW_MS) * 100));
  const urgent = open && percent <= 25;

  return (
    <div className="border-b border-hairline bg-surface px-4 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`text-xs font-medium ${
            open ? (urgent ? "text-amber-600 dark:text-amber-400" : "text-ink") : "text-danger"
          }`}
        >
          {open ? "Reply window open" : "Reply window closed"}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink-secondary">
          {open ? formatLeft(msLeft) : "24h elapsed"}
        </span>
      </div>

      <div
        className="mt-1.5 h-px w-full overflow-hidden bg-hairline-strong"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={24}
        aria-valuenow={Math.max(0, Math.round(msLeft / 3600000))}
        aria-label="Reply window remaining"
      >
        <div
          className={`h-full transition-[width] duration-1000 ease-linear ${
            urgent ? "bg-amber-500" : "bg-whatsapp"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}