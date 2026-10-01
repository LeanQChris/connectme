import type { Channel } from "../types";
import { messengerAdapter } from "./messenger";
import type { ChannelAdapter } from "./types";
import { whatsappAdapter } from "./whatsapp";

export type { ChannelAdapter, SendResult } from "./types";
export { ChannelNotConfiguredError, MetaSendError } from "../meta/client";

/**
 * Channel registry.
 *
 * Adding Instagram later: create lib/channels/instagram.ts exporting an adapter
 * (copy messenger.ts, POST to /{ig-user-id}/messages), then add it to this map.
 * Nothing else in the app needs to change.
 */
const adapters: Partial<Record<Channel, ChannelAdapter>> = {
  whatsapp: whatsappAdapter,
  messenger: messengerAdapter,
};

export function getChannel(channel: Channel): ChannelAdapter | undefined {
  return adapters[channel];
}

/** True when the channel can send right now, e.g. credentials are present. */
export function isChannelConfigured(channel: Channel): boolean {
  return adapters[channel]?.isConfigured() ?? false;
}