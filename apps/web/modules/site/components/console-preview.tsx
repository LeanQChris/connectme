"use client";

import { ChannelIcon, channelMeta } from "@/components/ui/channel-badge";
import type { Channel } from "@/core/types";

const CHANNELS: {
  name: string;
  channel: Channel;
}[] = [
  { name: "WhatsApp", channel: "whatsapp" },
  { name: "Messenger", channel: "messenger" },
  { name: "Instagram", channel: "instagram" },
  { name: "Telegram", channel: "telegram" },
  { name: "Discord", channel: "discord" },
];

export function ConsolePreview() {
  const threads = [
    {
      page: "Northwind Store",
      pageClass: "bg-messenger/10 text-messenger",
      name: "Alex Rivera",
      preview: "Does the Tuesday order ship before Friday?",
      time: "2m",
      unread: true,
    },
    {
      page: "@northwind",
      pageClass: "bg-pink-500/10 text-pink-500",
      name: "Marcus J",
      preview: "Is the consulting slot still open?",
      time: "18m",
      unread: true,
    },
    {
      page: "Support line",
      pageClass: "bg-whatsapp/10 text-whatsapp",
      name: "Priya N",
      preview: "Thanks, that worked.",
      time: "1h",
      unread: false,
    },
  ];

  return (
    <div className="overflow-hidden rounded-[12px] border border-hairline bg-canvas-elevated shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.09)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      <div className="flex h-9 items-center justify-between border-b border-hairline bg-canvas px-3">
        <div className="flex items-center gap-2 font-mono text-[10.5px] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-hairline-strong" />
          <span className="truncate">connectme.app/inbox</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          5 channels live
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[52px_minmax(0,1fr)]">
        <div className="hidden flex-col items-center gap-1.5 border-r border-hairline bg-canvas py-3 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-ink text-on-primary">
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 5h16v11H8l-4 4V5z" />
            </svg>
          </span>
          <span className="my-0.5 h-px w-5 bg-hairline" />
          {CHANNELS.map((channel, index) => (
            <span
              key={channel.name}
              title={channel.name}
              className={`relative flex h-8 w-8 items-center justify-center rounded-[8px] ${channelMeta(channel.channel).tile} text-white`}
            >
              <ChannelIcon channel={channel.channel} className="h-[17px] w-[17px]" />
              {index < 2 && (
                <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-ink px-1 font-mono text-[8.5px] font-bold text-on-primary">
                  {index + 1}
                </span>
              )}
            </span>
          ))}
        </div>

        <div className="min-w-0">
          <div className="flex h-8 items-center justify-between border-b border-hairline px-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mute">All conversations</span>
            <span className="rounded-full bg-surface-well px-1.5 py-px font-mono text-[9.5px] tabular-nums text-mute">
              3
            </span>
          </div>

          <ul className="divide-y divide-hairline">
            {threads.map((thread) => (
              <li
                key={thread.name}
                className={`flex items-center gap-2.5 px-3 py-2.5 ${
                  thread.unread ? "bg-canvas" : "bg-canvas-elevated"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-well font-mono text-[10px] font-medium text-body">
                  {thread.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[11.5px] font-medium text-ink">{thread.name}</span>
                    <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-mute">{thread.time}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`shrink-0 rounded-[3px] px-1.5 py-px font-mono text-[9px] ${thread.pageClass}`}>
                      {thread.page}
                    </span>
                    <span className="truncate text-[10.5px] text-mute">{thread.preview}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-hairline bg-canvas px-3 py-2">
            <p className="truncate font-mono text-[9.5px] text-mute">Reply sent via Northwind Store · Messenger</p>
          </div>
        </div>
      </div>
    </div>
  );
}
