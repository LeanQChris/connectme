/**
 * Core domain types and contracts for the web application.
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
  "file",
  "other",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_STATUSES = [
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const CONVERSATION_STATUSES = ["open", "closed", "snoozed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/** 8 MB, comfortably inside every channel's attachment ceiling. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface Contact {
  id: string;
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
  lastReadAt: string | null;
  assignee: string | null;
  tags: string[];
  status: ConversationStatus;
  createdAt: string;
}

export interface MessageMedia {
  url: string;
  type: MessageType;
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: Direction;
  type: MessageType;
  text: string | null;
  media?: MessageMedia[] | null;
  mediaUrl?: string | null;
  externalId: string | null;
  channel: Channel;
  status: MessageStatus;
  error: string | null;
  author?: string | null;
  createdAt: string;
}

export interface ReplyWindow {
  open: boolean;
  msRemaining: number | null;
}

export interface ConversationSummary {
  id: string;
  contactId: string;
  channel: Channel;
  accountId?: string | null;
  accountName?: string | null;
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

export interface SearchHit {
  conversation: ConversationSummary;
  snippet: string;
  createdAt: string;
  direction: Direction;
}

export interface UploadedMedia {
  url: string;
  type: MessageType;
  mimeType: string;
  name: string;
  size: number;
}

export interface ConnectedAccount {
  id: string;
  tenantId: string;
  provider: "meta" | "telegram" | "telegram-channel" | "discord" | "discord-channel";
  channel: Channel;
  name: string;
  externalId: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ConnectionFlag = "whatsapp" | "messenger" | "instagram" | "telegram" | "discord";

export interface SettingsPayload {
  settings: {
    accounts: ConnectedAccount[];
    connected: Record<ConnectionFlag, boolean>;
    pageId: string | null;
    pageName: string | null;
    instagramUsername: string | null;
    telegramBotId: string | null;
    discordBotId: string | null;
    updatedAt: string | null;
    webhookVerifyToken: string;
    waPhoneNumberId?: string | null;
    waAppId?: string | null;
  };
  oauth: {
    metaConfigured: boolean;
  };
  webhookUrls: { meta: string; telegram: string | null; discord: string | null };
}
