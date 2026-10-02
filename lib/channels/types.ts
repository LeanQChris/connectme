import type { Channel, Contact, MessageType, ProviderSecrets } from "../types";

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

export interface SendMediaInput extends SendTextInput {
  /** Absolute or app-relative URL the channel can fetch. */
  mediaUrl: string;
  mimeType: string;
  type: Extract<MessageType, "image" | "audio" | "video" | "document">;
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
  sendMedia?(input: SendMediaInput): Promise<SendResult>;
}