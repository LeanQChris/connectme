import type { ReactNode } from "react";
import type { Channel } from "@/core/types";

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
  discord: {
    label: "Discord",
    dot: "bg-[#5865F2]",
    text: "text-[#5865F2]",
    tile: "bg-[#5865F2]",
    soft: "bg-[#5865F2]/10 text-[#5865F2]",
  },
  slack: {
    label: "Slack",
    dot: "bg-[#4A154B]",
    text: "text-[#4A154B]",
    tile: "bg-[#4A154B]",
    soft: "bg-[#4A154B]/10 text-[#4A154B]",
  },
  widget: {
    label: "Website Widget",
    dot: "bg-emerald-500",
    text: "text-emerald-500",
    tile: "bg-emerald-500",
    soft: "bg-emerald-500/10 text-emerald-500",
  },
};

export function channelMeta(channel: Channel) {
  return CHANNEL_META[channel] || {
    label: channel,
    dot: "bg-slate-400",
    text: "text-slate-400",
    tile: "bg-slate-400",
    soft: "bg-slate-400/10 text-slate-400",
  };
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
  discord: (
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  ),
  slack: (
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm0 10.125a2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.522 2.528 2.528 0 0 1-2.52-2.522v-2.52h2.52zm0-1.272a2.528 2.528 0 0 1-2.522-2.52 2.528 2.528 0 0 1 2.522-2.522h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.52 2.52h-6.313z" />
  ),
  widget: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
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

export function ChannelIcon({
  channel,
  className = "h-[18px] w-[18px]",
}: {
  channel: Channel;
  className?: string;
}) {
  return (
    <svg className={`fill-current ${className}`} viewBox="0 0 24 24" aria-hidden>
      {CHANNEL_ICON[channel]}
    </svg>
  );
}

export function ChannelDot({ channel, className = "" }: { channel: Channel; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${CHANNEL_META[channel].dot} ${className}`}
    />
  );
}
