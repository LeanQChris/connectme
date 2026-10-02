import { ChannelType, TenantCredential } from "@connectme/database";

export interface ChannelSendContext {
  credentials?: TenantCredential | null;
  pageAccessToken?: string | null;
  contactExternalId: string;
  text?: string;
  mediaUrl?: string;
  mimeType?: string;
  type?: string;
  /** Meta message tag (e.g. HUMAN_AGENT) for sending outside the 24h window. */
  tag?: string;
}

export interface ChannelSendResult {
  externalId: string | null;
}

export interface IChannelClient {
  readonly channel: ChannelType;
  sendText(ctx: ChannelSendContext): Promise<ChannelSendResult>;
  sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult>;
}
