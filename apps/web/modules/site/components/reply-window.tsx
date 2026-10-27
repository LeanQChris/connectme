"use client";

import { useEffect, useState } from "react";

import { ChannelIcon } from "@/components/ui/channel-badge";
import { cn } from "@/core/utils/cn";

const WINDOW_SECONDS = 24 * 60 * 60;
// Start the demo clock at a plausible mid-window point rather than a
// suspicious 23:59:59, then let it actually run down.
const DEMO_REMAINING = 17 * 60 * 60 + 42 * 60 + 6;

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function format(total: number) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function toneFor(total: number) {
  if (total <= 60 * 60) {
    return { stroke: "var(--error)", label: "Window closing", tone: "text-error" };
  }
  if (total <= 6 * 60 * 60) {
    return { stroke: "var(--warning)", label: "Reply soon", tone: "text-warning" };
  }
  return { stroke: "var(--spectrum-whatsapp)", label: "Window open", tone: "text-whatsapp" };
}

export function ReplyWindow() {
  const [remaining, setRemaining] = useState(DEMO_REMAINING);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((current) => (current <= 0 ? WINDOW_SECONDS : current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const { stroke, label, tone } = toneFor(remaining);
  const progress = Math.max(0, Math.min(1, remaining / WINDOW_SECONDS));

  return (
    <figure className="overflow-hidden rounded-[14px] border border-hairline bg-canvas-elevated">
      <figcaption className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
          Reply window
        </span>
        <span className={cn("font-mono text-[10.5px]", tone)}>{label}</span>
      </figcaption>

      <div className="flex items-center gap-5 px-4 py-5">
        <div className="relative h-[108px] w-[108px] shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke="var(--hairline)"
              strokeWidth="10"
            />
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke={stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 400ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mute">
              left
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[22px] font-medium tabular-nums tracking-[-0.03em] text-ink">
            {format(remaining)}
          </p>
          <p className={cn("mt-0.5 text-[13px]", tone)}>{label}</p>

          <p className="mt-4 text-[14px] font-semibold tracking-[-0.02em] text-ink">
            Priya Nadkarni
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-body">
            Has the parcel arrived yet? Asked at 09:41 on the Northwind Store line.
          </p>

          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface-well px-2.5 py-1 font-mono text-[10.5px] text-body">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-whatsapp text-white">
              <ChannelIcon channel="whatsapp" className="h-[9px] w-[9px]" />
            </span>
            WhatsApp
          </span>
        </div>
      </div>

      <p className="border-t border-hairline px-4 py-2.5 text-[12px] leading-relaxed text-mute">
        Free-form replies stay open for 24 hours. After that WhatsApp needs an
        approved template.
      </p>
    </figure>
  );
}