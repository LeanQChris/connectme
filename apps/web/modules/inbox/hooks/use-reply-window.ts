"use client";

import { useEffect, useState } from "react";
import { REPLY_WINDOW_MS } from "@/core/utils/window";

function useNow(intervalMs: number, enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

function formatLeft(msLeft: number): string {
  const totalMinutes = Math.max(0, Math.floor(msLeft / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`;
}

interface UseReplyWindowOptions {
  lastInboundAt: string | null;
  channel?: string;
}

export function useReplyWindow({ lastInboundAt, channel }: UseReplyWindowOptions) {
  const isUnlimited = channel === "telegram" || channel === "discord";
  const isDiscord = channel === "discord";

  // Only run periodic tick for channels bounded by a 24h window (tick every 10s instead of 1s)
  const now = useNow(10000, !isUnlimited);

  const msLeft = lastInboundAt
    ? REPLY_WINDOW_MS - (now - new Date(lastInboundAt).getTime())
    : REPLY_WINDOW_MS;
  const open = msLeft > 0;
  const percent = Math.max(0, Math.min(100, (msLeft / REPLY_WINDOW_MS) * 100));
  const urgent = open && percent <= 25;
  const formattedLeft = open ? formatLeft(msLeft) : "Window Expired";

  return {
    isUnlimited,
    isDiscord,
    channelName: isDiscord ? "Discord" : "Telegram",
    brandColor: isDiscord ? "bg-[#5865F2]" : "bg-sky-500",
    textColor: isDiscord ? "text-[#5865F2]" : "text-sky-500",
    open,
    urgent,
    percent,
    msLeft,
    formattedLeft,
  };
}
