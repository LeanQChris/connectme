/**
 * Shared domain types. Imported by both server and client code,
 * so this file must stay free of any server-only imports.
 */

export const CHANNELS = [
  "whatsapp",
  "messenger",
  "instagram",
  "telegram",
  "discord",
  "slack",
  "widget",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const DIRECTIONS = ["in", "out", "note"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "other",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

/** Kinds that can be sent as an attachment. */
export const MEDIA_KINDS = ["image", "audio", "video", "document", "sticker"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export function isMediaKind(value: unknown): value is MediaKind {
  return MEDIA_KINDS.includes(value as MediaKind);
}

/** One attachment on a message. A message may carry several. */
export interface MessageMedia {
  /** Absolute or app-relative URL; the UI proxies private provider URLs. */
  url: string;
  type: MediaKind;
  mimeType: string;
  /** Original filename, used by the file card and provider uploads. */
  name: string | null;
  size: number | null;
}

export const MESSAGE_STATUSES = [
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const CONVERSATION_STATUSES = ["open", "closed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/** 8 MB, comfortably inside every channel's attachment ceiling. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface Contact {
  id: string;
  /** Owning tenant. Contacts are never shared between accounts. */
  userId: string;
  channel: Channel;
  externalId: string;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  contactId: string;
  accountId?: string | null;
  accountName?: string | null;
  lastMessageAt: string;
  lastInboundAt: string | null;
  unreadCount: number;
  /** When the thread was last opened, so the UI can mark the unread boundary. */
  lastReadAt: string | null;
  assignee: string | null;
  tags: string[];
  status: ConversationStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: Direction;
  type: MessageType;
  text: string | null;
  media: MessageMedia[];
  externalId: string | null;
  /** Every platform id when one message became several on the far side. */
  externalIds: string[];
  channel: Channel;
  status: MessageStatus;
  error: string | null;
  /** Set on internal notes only. */
  author?: string | null;
  createdAt: string;
}

/** Window status of the platform's free-form reply window. */
export interface ReplyWindow {
  open: boolean;
  /** Milliseconds left in the window; null once closed. */
  msRemaining: number | null;
}

export interface ConversationSummary {
  id: string;
  contactId: string;
  channel: Channel;
  accountId?: string | null;
  accountName?: string | null;
  /** Contact display name, falling back to the platform id. */
  contactName: string;
  contactExternalId: string;
  avatarUrl?: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  lastInboundAt: string | null;
  unreadCount: number;
  lastReadAt: string | null;
  assignee: string | null;
  tags: string[];
  status: ConversationStatus;
  window: ReplyWindow;
}

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: Message[];
}

/** One conversation plus the newest message body that matched a search. */
export interface SearchHit {
  conversation: ConversationSummary;
  snippet: string;
  createdAt: string;
  direction: Direction;
}

/** An uploaded file served back from /api/media. */
export interface UploadedMedia {
  url: string;
  type: MediaKind;
  mimeType: string;
  name: string;
  size: number;
}

/** Local mirror of the Clerk user, created on first authenticated request. */
export interface TenantUser {
  /** Clerk user id, e.g. user_2abc… */
  userId: string;
  email: string;
  name: string | null;
  createdAt: string;
}

/** A connected social messaging account (Facebook Page, Instagram handle, etc.) */
export interface ConnectedAccount {
  id: string;
  provider: "meta" | "telegram" | "discord" | "whatsapp" | "slack" | "widget";
  channel: Channel;
  name: string;
  externalId: string;
  token?: string;
  avatarUrl?: string | null;
  connectedAt: string;
}

/**
 * A tenant's provider credentials, decrypted for the duration of one request.
 * Everything here comes from that tenant's own settings form.
 */
export interface ProviderSecrets {
  waPhoneNumberId: string;
  waAccessToken: string;
  /** Meta App id; WhatsApp attachment uploads are addressed by it. */
  waAppId: string;
  /** WhatsApp-specific App Secret (if using a dedicated WhatsApp Meta App). */
  waAppSecret?: string;
  /** Used to verify X-Hub-Signature-256 on Meta / Facebook webhooks. */
  metaAppSecret: string;
  /** Dedicated Instagram App Secret (if using Instagram API with Instagram Login). */
  instagramAppSecret?: string;
  /** Must match the verify token configured on the Meta webhook. */
  webhookVerifyToken: string;
  /** Facebook Page token, used by both Messenger and Instagram. */
  pageAccessToken: string;
  telegramBotToken: string;
  discordBotToken: string;
  discordPublicKey: string;
  slackBotToken: string;
  slackSigningSecret: string;
  graphVersion: string;
}

export const EMPTY_SECRETS: ProviderSecrets = {
  waPhoneNumberId: "",
  waAccessToken: "",
  waAppId: "",
  waAppSecret: "",
  metaAppSecret: "",
  instagramAppSecret: "",
  webhookVerifyToken: "",
  pageAccessToken: "",
  telegramBotToken: "",
  discordBotToken: "",
  discordPublicKey: "",
  slackBotToken: "",
  slackSigningSecret: "",
  graphVersion: "",
};

/** What the settings UI may read back: presence flags, never the secrets. */
export type ConnectionFlag =
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "telegram"
  | "discord"
  | "slack"
  | "widget";

/** A reply queued in a website visitor's browser until they poll for it. */
export interface WidgetOutboxItem {
  id: string;
  userId: string;
  /** Widget session id; also the contact's externalId. */
  sid: string;
  text: string | null;
  media: MessageMedia[];
  type: MessageType;
  createdAt: string;
  /** Set once the visitor's browser has picked the item up. */
  deliveredAt: string | null;
}

/** Stored shape: encrypted blob plus the plaintext ids webhooks route on. */
export interface CredentialRecord {
  userId: string;
  encrypted: string;
  /** List of all connected multi-accounts for this tenant. */
  accounts?: ConnectedAccount[];
  /** Meta messaging phone number id; routes whatsapp_business_account events. */
  waPhoneNumberId?: string;
  /** Facebook Page id; routes `page` and `instagram` events. */
  pageId?: string;
  /** Facebook Page display name (from OAuth). */
  pageName?: string;
  /** Connected Instagram username (from OAuth). */
  instagramUsername?: string;
  /** Telegram bot id, taken from the token; routes Bot API webhooks. */
  telegramBotId?: string;
  /** Discord bot / application id; routes Discord webhooks. */
  discordBotId?: string;
  /** Slack workspace / bot id. */
  slackTeamId?: string;
  slackBotId?: string;
  /** Public id of this tenant's website widget; routes widget API calls. */
  widgetId?: string;
  updatedAt: string;
}

export interface TenantSettings {
  secrets: ProviderSecrets;
  accounts: ConnectedAccount[];
  connected: Record<ConnectionFlag, boolean>;
  pageId: string | null;
  pageName: string | null;
  instagramUsername: string | null;
  telegramBotId: string | null;
  discordBotId: string | null;
  slackTeamId: string | null;
  slackBotId: string | null;
  widgetId: string | null;
  updatedAt: string | null;
}

/** Settings payload: rendered on the server, then refreshed by the API. */
export interface SettingsPayload {
  settings: {
    accounts: ConnectedAccount[];
    connected: Record<ConnectionFlag, boolean>;
    pageId: string | null;
    pageName: string | null;
    instagramUsername: string | null;
    telegramBotId: string | null;
    discordBotId: string | null;
    slackTeamId: string | null;
    slackBotId: string | null;
    widgetId: string | null;
    /** Copyable <script> tag for the tenant's website. */
    widgetScriptUrl: string | null;
    updatedAt: string | null;
    /** Copyable only — the tokens themselves are never sent back. */
    webhookVerifyToken: string;
    waPhoneNumberId?: string | null;
    waAppId?: string | null;
  };
  oauth: {
    metaConfigured: boolean;
  };
  webhookUrls: {
    meta: string;
    telegram: string | null;
    discord: string | null;
    slack: string | null;
  };
}
