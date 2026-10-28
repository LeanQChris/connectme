import type { Channel, MessageType } from "@/core/types";

export const SCHEDULED_POST_STATUSES = [
  "pending",
  "scheduled",
  "published",
  "failed",
  "canceled",
] as const;
export type ScheduledPostStatus = (typeof SCHEDULED_POST_STATUSES)[number];

export const SCHEDULED_MESSAGE_STATUSES = [
  "pending",
  "sent",
  "failed",
  "canceled",
] as const;
export type ScheduledMessageStatus = (typeof SCHEDULED_MESSAGE_STATUSES)[number];

export const SCHEDULED_POST_KINDS = ["text", "image", "video", "reel", "carousel"] as const;
export type ScheduledPostKind = (typeof SCHEDULED_POST_KINDS)[number];

export type ScheduleMode = "native" | "local";

export interface ScheduledPost {
  id: string;
  tenantId: string;
  accountId: string | null;
  channel: Channel;
  kind: ScheduledPostKind;
  caption: string | null;
  mediaUrls: string[];
  scheduledFor: string;
  status: ScheduledPostStatus;
  mode: ScheduleMode;
  platformPostId: string | null;
  externalUrl: string | null;
  attempts: number;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledMessage {
  id: string;
  tenantId: string;
  conversationId: string;
  channel: Channel;
  text: string | null;
  mediaUrl: string | null;
  mediaType: MessageType | null;
  scheduledFor: string;
  status: ScheduledMessageStatus;
  attempts: number;
  lastError: string | null;
  externalId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledPostInput {
  accountId: string;
  channel?: Channel;
  kind?: ScheduledPostKind;
  caption?: string;
  mediaUrls?: string[];
  scheduledFor: string;
  timezone?: string;
}

export interface CreateScheduledMessageInput {
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: MessageType;
  scheduledFor: string;
  timezone?: string;
}

export interface UpdateScheduledPostInput {
  caption?: string;
  mediaUrls?: string[];
  scheduledFor?: string;
  timezone?: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Post scheduling is supported for Facebook Pages (native), Instagram,
 * Telegram channel targets, and Discord channel targets (all system-side).
 * Pages are modeled with the `messenger` channel.
 */
export const POST_CHANNEL_LABELS: Partial<Record<Channel, string>> = {
  messenger: "Facebook Page",
  instagram: "Instagram",
  telegram: "Telegram channel",
  discord: "Discord channel",
};

export const POST_SCHEDULABLE_CHANNELS: Channel[] = [
  "messenger",
  "instagram",
  "telegram",
  "discord",
];

export function isPostSchedulable(account: { channel: Channel; provider: string; isActive?: boolean }): boolean {
  if (account.isActive === false) return false;
  if (!POST_SCHEDULABLE_CHANNELS.includes(account.channel)) return false;
  // A Telegram/Discord bot account is a messaging endpoint; only a registered
  // channel target can receive scheduled posts.
  if (account.channel === "telegram") return account.provider === "telegram-channel";
  if (account.channel === "discord") return account.provider === "discord-channel";
  return true;
}
export const POST_SCHEDULING_REQUIREMENTS: Partial<Record<Channel, string>> = {
  messenger: "Facebook Page: requires pages_manage_posts and a valid Page token. Facebook stores the scheduled post.",
  instagram: "Instagram: requires a professional account, instagram_content_publish, and public media. ConnectMe publishes at the scheduled time; text-only posts are unavailable.",
  telegram: "Telegram: add the bot as a channel administrator with permission to post messages.",
  discord: "Discord: grant the bot View Channel, Send Messages and Attach Files permissions for the target channel.",
};
