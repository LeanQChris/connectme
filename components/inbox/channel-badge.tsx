import type { ReactNode } from "react";

import type { Channel } from "@/lib/types";

const CHANNEL_META: Record<
  Channel,
  { label: string; dot: string; text: string; tile: string; soft: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    dot: "bg-whatsapp",
    text: "text-whatsapp",
    tile: "bg-whatsapp",
    soft: "bg-whatsapp/10 text-whatsapp",
  },
  messenger: {
    label: "Messenger",
    dot: "bg-messenger",
    text: "text-messenger",
    tile: "bg-messenger",
    soft: "bg-messenger/10 text-messenger",
  },
  instagram: {
    label: "Instagram",
    dot: "bg-pink-500",
    text: "text-pink-500",
    tile: "bg-pink-500",
    soft: "bg-pink-500/10 text-pink-500",
  },
  telegram: {
    label: "Telegram",
    dot: "bg-sky-500",
    text: "text-sky-500",
    tile: "bg-sky-500",
    soft: "bg-sky-500/10 text-sky-500",
  },
};

export function channelMeta(channel: Channel) {
  return CHANNEL_META[channel];
}

const CHANNEL_ICON: Record<Channel, ReactNode> = {
  whatsapp: (
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z" />
  ),
  messenger: (
    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.734 7.218V22l3.39-1.86c.928.257 1.91.396 2.876.396 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.066 12.463-2.73-2.91-5.328 2.91 5.86-6.222 2.798 2.91 5.26-2.91-5.86 6.222z" />
  ),
  telegram: (
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.58 4.59-1.86 5.11-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.18-.04.32z" />
  ),
  // Stroked rather than a long filled path: stays crisp at 19px.
  instagram: (
    <>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
};

/** Monochrome brand glyph, tinted by the surrounding chrome. */
export function ChannelIcon({ channel, className = "" }: { channel: Channel; className?: string }) {
  return (
    <svg
      className={`h-[18px] w-[18px] fill-current ${className}`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      {CHANNEL_ICON[channel]}
    </svg>
  );
}

/** The only saturated colour in the app: identifies the channel. */
export function ChannelDot({ channel, className = "" }: { channel: Channel; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${CHANNEL_META[channel].dot} ${className}`}
    />
  );
}