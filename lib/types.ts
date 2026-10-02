/**
 * Shared domain types. Imported by both server and client code,
 * so this file must stay free of any server-only imports.
 */

export const CHANNELS = ["whatsapp", "messenger", "instagram", "telegram"] as const;
export type Channel = (typeof CHANNELS)[number];

export const DIRECTIONS = ["in", "out"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "video",
  "document",
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

export const CONVERSATION_STATUSES = ["open", "closed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export interface Contact {
  id: string;
  channel: Channel;
  externalId: string;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  lastMessageAt: string;
  lastInboundAt: string | null;
  unreadCount: number;
  status: ConversationStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: Direction;
  type: MessageType;
  text: string | null;
  mediaUrl?: string | null;
  externalId: string | null;
  channel: Channel;
  status: MessageStatus;
  error: string | null;
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
  /** Contact display name, falling back to the platform id. */
  contactName: string;
  contactExternalId: string;
  avatarUrl?: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  lastInboundAt: string | null;
  unreadCount: number;
  status: ConversationStatus;
  window: ReplyWindow;
}

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: Message[];
}