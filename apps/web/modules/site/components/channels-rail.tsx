"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
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
    arrives: "Text, images, voice notes and files.",
    rule: "Free-form replies for 24 hours, templates after that.",
  },
  {
    name: "Messenger",
    channel: "messenger",
    account: "Facebook page",
    arrives: "Page inbox messages and comments turned into DMs.",
    rule: "Per-page routing on the token that owns the thread.",
  },
  {
    name: "Instagram",
    channel: "instagram",
    account: "Professional account",
    arrives: "Direct messages sent to your profile.",
    rule: "Same 24 hour window as WhatsApp.",
  },
  {
    name: "Telegram",
    channel: "telegram",
    account: "Bot",
    arrives: "Direct messages and group messages.",
    rule: "No window. Reply whenever you like.",
  },
  {
    name: "Discord",
    channel: "discord",
    account: "Bot",
    arrives: "Channel messages and direct messages.",
    rule: "No window. Reply whenever you like.",
  },
];

export function ChannelsRail() {
  return (
    <section id="channels" className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-24">
        <div data-reveal className="max-w-2xl">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[38px]">
            One queue across five channels.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-body">
            Each provider keeps its own reply rules. ConnectMe carries those
            rules with the message, so you never have to remember which window
            you are inside.
          </p>
        </div>

        <ul
          data-reveal
          style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
          className="mt-10 grid overflow-hidden rounded-xl border border-hairline bg-canvas-elevated sm:grid-cols-2 lg:grid-cols-5"
        >
          {CHANNELS.map((channel) => (
            <li
              key={channel.name}
              className="flex flex-col border-b border-hairline p-5 last:border-b-0 sm:[&:nth-child(2n)]:border-l sm:[&:nth-child(2n+1)]:border-l-0 lg:border-b-0 lg:border-l lg:first:border-l-0"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-hairline bg-surface-well"
                  style={{ color: `var(--spectrum-${channel.channel})` }}
                >
                  <ChannelIcon channel={channel.channel} className="h-[15px] w-[15px]" />
                </span>
                <span className="text-[14px] font-semibold tracking-[-0.02em] text-ink">
                  {channel.name}
                </span>
              </div>

              <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
                {channel.account}
              </p>

              <p className="mt-2.5 text-[13px] leading-relaxed text-body">
                {channel.arrives}
              </p>

              <p className="mt-auto pt-4 text-[12.5px] leading-relaxed text-mute">
                {channel.rule}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
