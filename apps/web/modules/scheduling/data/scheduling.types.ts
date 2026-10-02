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
 * Post scheduling is supported for Facebook Pages (native scheduling) and
 * Instagram (system-side). Pages are modeled with the `messenger` channel.
 */
export const POST_SCHEDULABLE_CHANNELS: Channel[] = ["messenger", "instagram"];

export function isPostSchedulable(channel: Channel): boolean {
  return POST_SCHEDULABLE_CHANNELS.includes(channel);
}