"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
import type { Channel } from "@/core/types";
import { cn } from "@/core/utils/cn";

const ROWS: {
  name: string;
  channel: Channel;
  message: string;
  time: string;
  initials: string;
  unread?: boolean;
  active?: boolean;
}[] = [
  {
    name: "Priya Nadkarni",
    channel: "whatsapp",
    message: "Has the parcel arrived yet?",
    time: "09:41",
    initials: "PN",
    unread: true,
    active: true,
  },
  {
    name: "@aurora.studios",
    channel: "instagram",
    message: "Do you support voice notes and attachments?",
    time: "09:12",
    initials: "AS",
    unread: true,
  },
  {
    name: "Elena Rostova",
    channel: "messenger",
    message: "Tracking says delivered today. Thank you!",
    time: "08:54",
    initials: "ER",
  },
  {
    name: "Northwind EU",
    channel: "telegram",
    message: "Can we move the call to Thursday?",
    time: "08:31",
    initials: "NE",
  },
];

export function InboxPreview() {
  return (
    <figure className="overflow-hidden rounded-xl border border-hairline bg-canvas-elevated shadow-[0px_1px_2px_rgba(0,0,0,0.04)]">
      <figcaption className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-semibold tracking-[-0.02em] text-ink">
            Inbox
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            All channels
          </span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-whatsapp" />
          Live
        </span>
      </figcaption>

      <ul className="divide-y divide-hairline">
        {ROWS.map((row) => (
          <li
            key={row.name}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              row.active && "bg-surface-well/60",
            )}
          >
            <div className="relative shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface-well font-mono text-[10.5px] font-medium text-body">
                {row.initials}
              </span>
              <span
                className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-canvas-elevated text-white"
                style={{ background: `var(--spectrum-${row.channel})` }}
              >
                <ChannelIcon channel={row.channel} className="h-[8px] w-[8px]" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[12.5px] font-medium text-ink">
                  {row.name}
                </span>
                {row.unread && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-link" />
                )}
              </div>
              <p className="truncate text-[11.5px] text-body">{row.message}</p>
            </div>

            <span className="shrink-0 font-mono text-[10.5px] text-mute">{row.time}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5">
        <span className="font-mono text-[10.5px] text-mute">4 conversations</span>
        <span className="font-mono text-[10.5px] text-mute">2 unread</span>
      </div>
    </figure>
  );
}
