import type { Channel } from "../types";
import { discordAdapter } from "./discord";
import { emailAdapter } from "./email";
import { smsAdapter } from "./sms";
import { viberAdapter } from "./viber";
import { instagramAdapter } from "./instagram";
import { messengerAdapter } from "./messenger";
import { slackAdapter } from "./slack";
import { telegramAdapter } from "./telegram";
import type { ChannelAdapter, Tenant } from "./types";
import { whatsappAdapter } from "./whatsapp";
import { widgetAdapter } from "./widget";

export type { ChannelAdapter, OutboundMedia, SendResult, Tenant } from "./types";
export { canSendMedia, supportedMediaKinds } from "./types";
export { ChannelNotConfiguredError, MetaSendError } from "../meta/client";

/**
 * Channel registry.
 */
const adapters: Partial<Record<Channel, ChannelAdapter>> = {
  whatsapp: whatsappAdapter,
  messenger: messengerAdapter,
  instagram: instagramAdapter,
  telegram: telegramAdapter,
  discord: discordAdapter,
  slack: slackAdapter,
  widget: widgetAdapter,
  sms: smsAdapter,
  viber: viberAdapter,
  email: emailAdapter,
};

export function getChannel(channel: Channel): ChannelAdapter | undefined {
  return adapters[channel];
}

/** True when this tenant can send on that channel right now. */
export function isChannelConfigured(channel: Channel, tenant: Tenant): boolean {
  return adapters[channel]?.isConfigured(tenant) ?? false;
}