import { ChannelType, TenantCredential } from "@connectme/database";

export interface ChannelMediaItem {
  url: string;
  type?: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
}

export interface ChannelSendContext {
  credentials?: TenantCredential | null;
  pageAccessToken?: string | null;
  contactExternalId: string;
  text?: string;
  /** Canonical attachments. Single-URL callers put their one item here. */
  media?: ChannelMediaItem[];
  mimeType?: string;
  type?: string;
  /** Meta message tag (e.g. HUMAN_AGENT) for sending outside the 24h window. */
  tag?: string;
}

export interface ChannelSendResult {
  externalId: string | null;
  skipped?: string[];
}

export interface IChannelClient {
  readonly channel: ChannelType;
  sendText(ctx: ChannelSendContext): Promise<ChannelSendResult>;
  sendMedia(ctx: ChannelSendContext): Promise<ChannelSendResult>;
}
