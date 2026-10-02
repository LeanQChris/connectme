import type { Channel } from "../types";
import { instagramAdapter } from "./instagram";
import { messengerAdapter } from "./messenger";
import { telegramAdapter } from "./telegram";
import type { ChannelAdapter } from "./types";
import { whatsappAdapter } from "./whatsapp";

export type { ChannelAdapter, SendResult } from "./types";
export { ChannelNotConfiguredError, MetaSendError } from "../meta/client";

/**
 * Channel registry.
 */
const adapters: Partial<Record<Channel, ChannelAdapter>> = {
  whatsapp: whatsappAdapter,
  messenger: messengerAdapter,
  instagram: instagramAdapter,
  telegram: telegramAdapter,
};

export function getChannel(channel: Channel): ChannelAdapter | undefined {
  return adapters[channel];
}

/** True when the channel can send right now, e.g. credentials are present. */
export function isChannelConfigured(channel: Channel): boolean {
  return adapters[channel]?.isConfigured() ?? false;
}