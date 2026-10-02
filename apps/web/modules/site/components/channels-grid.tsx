"use client";

import { ChannelIcon, channelMeta } from "@/components/ui/channel-badge";
import type { Channel } from "@/core/types";

const CHANNELS: {
  name: string;
  channel: Channel;
  account: string;
  arrives: string;
  rule: string;
}[] = [
  {
    name: "WhatsApp",
    channel: "whatsapp",
    account: "Business number",
    arrives: "Text, images, voice notes, files",
    rule: "Free-form replies inside 24h",
  },
  {
    name: "Messenger",
    channel: "messenger",
    account: "Facebook page",
    arrives: "Page inbox messages and comments-to-DMs",
    rule: "Labeled, template-aware, per-page routing",
  },
  {
    name: "Instagram",
    channel: "instagram",
    account: "Professional account",
    arrives: "Direct messages from your profile",
    rule: "Same 24h messaging window",
  },
  {
    name: "Telegram",
    channel: "telegram",
    account: "Bot",
    arrives: "Direct and group messages",
    rule: "No window, reply anytime",
  },
  {
    name: "Discord",
    channel: "discord",
    account: "Bot",
    arrives: "Channel and DM messages",
    rule: "No window, reply anytime",
  },
];

export function ChannelsGrid() {
  return (
    <section id="channels" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <div className="max-w-2xl">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">Channels</p>
        <h2 className="mt-2.5 text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">
          Connect the accounts you already run.
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-body">
          Each one lands in the same thread list with its own reply rules attached, so nothing about the policy
          of a channel is something you have to remember.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-[10px] border border-hairline">
        <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] gap-4 border-b border-hairline bg-canvas px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-wider text-mute md:grid">
          <span>Channel</span>
          <span>What arrives</span>
          <span>Reply rule</span>
        </div>
        <ul className="divide-y divide-hairline">
          {CHANNELS.map((channel) => (
            <li
              key={channel.name}
              className="grid gap-1.5 px-4 py-3.5 transition-colors hover:bg-surface-well md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] md:items-baseline md:gap-4"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] ${channelMeta(channel.channel).tile} text-white`}
                >
                  <ChannelIcon channel={channel.channel} className="h-[15px] w-[15px]" />
                </span>
                <span className="text-[13.5px] font-medium text-ink">{channel.name}</span>
                <span className="font-mono text-[10.5px] text-mute">{channel.account}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-body md:text-[12.5px]">{channel.arrives}</p>
              <p className="font-mono text-[11px] leading-relaxed text-mute">{channel.rule}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
