import type {
  Channel,
  Contact,
  MediaKind,
  MessageMedia,
  MessageType,
  ProviderSecrets,
} from "../types";

export { ChannelNotConfiguredError, MetaSendError } from "../meta/client";

/** One tenant's decrypted provider credentials, plus their userId. */
export type Tenant = ProviderSecrets & { userId: string };

export interface SendResult {
  /** Platform message id, used later to match delivery status updates. */
  externalId: string | null;
}

/** The minimum a contact needs to be addressable by a channel. */
export type AddressableContact = Pick<Contact, "channel" | "externalId">;

export interface SendTextInput {
  tenant: Tenant;
  contact: AddressableContact;
  text: string;
  type?: MessageType;
}

/**
 * One attachment on its way out. `url` is absolute by this point, because every
 * provider fetches it itself.
 */
export type OutboundMedia = MessageMedia;

export interface SendMediaInput extends SendTextInput {
  media: OutboundMedia[];
}

/**
 * One channel, one file. Implementations only send; storing the message,
 * checking the reply window and handling failures belongs to the reply API.
 */
export interface ChannelAdapter {
  channel: Channel;
  /** True when this tenant has the credentials this channel needs. */
  isConfigured(tenant: Tenant): boolean;
  sendText(input: SendTextInput): Promise<SendResult>;
  /** Absent when the channel cannot accept attachments. */
  sendMedia?(input: SendMediaInput): Promise<SendResult[]>;
}

/**
 * What each platform will actually accept.
 *
 * Instagram messaging is the only hard platform limit here: images and audio
 * only. Everything else refuses silently or delivers as a link, so the composer
 * hides the kinds a channel cannot take rather than failing at send time.
 */
const SUPPORT: Record<Channel, MediaKind[]> = {
  whatsapp: ["image", "audio", "video", "document"],
  messenger: ["image", "audio", "video", "document"],
  instagram: ["image", "audio"],
  telegram: ["image", "audio", "video", "document", "sticker"],
  discord: ["image", "audio", "video", "document"],
  slack: ["image", "audio", "video", "document"],
  widget: ["image", "audio", "video", "document"],
};

export function supportedMediaKinds(channel: Channel): MediaKind[] {
  return SUPPORT[channel] ?? [];
}

export function canSendMedia(channel: Channel, kind: MediaKind): boolean {
  return SUPPORT[channel]?.includes(kind) ?? false;
}