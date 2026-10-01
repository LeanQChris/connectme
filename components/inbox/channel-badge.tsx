import type { Channel } from "@/lib/types";

const CHANNEL_META: Record<Channel, { label: string; dot: string; text: string }> = {
  whatsapp: { label: "WhatsApp", dot: "bg-whatsapp", text: "text-whatsapp" },
  messenger: { label: "Messenger", dot: "bg-messenger", text: "text-messenger" },
  instagram: { label: "Instagram", dot: "bg-pink-500", text: "text-pink-500" },
};

export function channelMeta(channel: Channel) {
  return CHANNEL_META[channel];
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