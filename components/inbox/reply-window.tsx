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

  if (channel === "telegram") {
    return (
      <div className="border-b border-hairline bg-canvas px-4 py-2 text-[11px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </span>
            <span className="font-medium text-body">
              Unlimited Messaging Window Active
            </span>
          </div>

          <span className="font-mono text-[11px] tabular-nums text-sky-500 font-medium">
            No Time Limit
          </span>
        </div>

        <p className="mt-1 leading-snug text-mute">
          <span className="font-medium text-body">Telegram rule:</span> Telegram bots have no 24-hour window restriction. You can reply anytime.
        </p>
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
    <div className="border-b border-hairline bg-canvas px-4 py-2 text-[11px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {open && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  urgent ? "bg-warning" : "bg-emerald-500"
                }`}
              />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                open ? (urgent ? "bg-warning" : "bg-emerald-500") : "bg-error"
              }`}
            />
          </span>
          <span
            className={`font-medium ${
              open ? (urgent ? "text-warning" : "text-body") : "text-error"
            }`}
          >
            {open ? "24h Standard Messaging Window Active" : "24h Window Closed"}
          </span>
        </div>

        <span className="font-mono text-[11px] tabular-nums text-mute">
          {open ? formatLeft(msLeft) : "Window Expired"}
        </span>
      </div>

      <p className={`mt-1 leading-snug ${open ? "text-mute" : "text-error/90"}`}>
        {open ? (
          <>
            <span className="font-medium text-body">Meta rule:</span> free-form replies are allowed for
            24h after the customer&apos;s last message. After that you must send an approved template.
          </>
        ) : (
          <>
            <span className="font-medium">Meta rule:</span> 24h elapsed, so free-form replies are
            blocked. Wait for the customer to message first, or send an approved template.
          </>
        )}
      </p>

      <div
        className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-hairline"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={24}
        aria-valuenow={Math.max(0, Math.round(msLeft / 3600000))}
        aria-label="Reply window progress"
      >
        <div
          className={`h-full transition-[width] duration-1000 ease-linear ${
            !open
              ? "bg-error"
              : urgent
                ? "bg-warning"
                : "bg-ink"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}