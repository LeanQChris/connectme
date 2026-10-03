import { z } from "zod";
import { ChannelSchema } from "./channels";
import { ConversationStatusSchema } from "./conversations";
import {
  ScheduledPostStatusSchema,
  type ScheduledPostStatus,
} from "./scheduled-posts";
import {
  ScheduledMessageStatusSchema,
  type ScheduledMessageStatus,
} from "./scheduled-messages";

export interface DashboardTotalsDto {
  openConversations: number;
  unreadMessages: number;
  needsAttention: number;
  replyWindowClosing: number;
  scheduledUpcoming: number;
  scheduledFailed: number;
  avgFirstResponseMs: number | null;
}

export const DashboardTotalsDtoSchema = z.object({
  openConversations: z.number(),
  unreadMessages: z.number(),
  needsAttention: z.number(),
  replyWindowClosing: z.number(),
  scheduledUpcoming: z.number(),
  scheduledFailed: z.number(),
  avgFirstResponseMs: z.number().nullable(),
});

export interface ChannelBreakdownDto {
  channel: z.infer<typeof ChannelSchema>;
  open: number;
  unread: number;
}

export const ChannelBreakdownDtoSchema = z.object({
  channel: ChannelSchema,
  open: z.number(),
  unread: z.number(),
});

export interface VolumePointDto {
  date: string;
  inbound: number;
  outbound: number;
}

export const VolumePointDtoSchema = z.object({
  date: z.string(),
  inbound: z.number(),
  outbound: z.number(),
});

export interface StatusBreakdownDto {
  status: z.infer<typeof ConversationStatusSchema>;
  count: number;
}

export const StatusBreakdownDtoSchema = z.object({
  status: ConversationStatusSchema,
  count: z.number(),
});

export interface ScheduledPostCountDto {
  status: ScheduledPostStatus;
  count: number;
}

export const ScheduledPostCountDtoSchema = z.object({
  status: ScheduledPostStatusSchema,
  count: z.number(),
});

export interface ScheduledMessageCountDto {
  status: ScheduledMessageStatus;
  count: number;
}

export const ScheduledMessageCountDtoSchema = z.object({
  status: ScheduledMessageStatusSchema,
  count: z.number(),
});

export interface NeedsAttentionDto {
  id: string;
  contactName: string;
  channel: z.infer<typeof ChannelSchema>;
  unreadCount: number;
  lastMessageAt: string;
  replyWindowEndsAt: string | null;
  replyWindowOpen: boolean;
}

export const NeedsAttentionDtoSchema = z.object({
  id: z.string(),
  contactName: z.string(),
  channel: ChannelSchema,
  unreadCount: z.number(),
  lastMessageAt: z.string(),
  replyWindowEndsAt: z.string().nullable(),
  replyWindowOpen: z.boolean(),
});

export interface DashboardStatsDto {
  generatedAt: string;
  windowDays: number;
  totals: DashboardTotalsDto;
  byChannel: ChannelBreakdownDto[];
  byStatus: StatusBreakdownDto[];
  volume: VolumePointDto[];
  scheduledPosts: ScheduledPostCountDto[];
  scheduledMessages: ScheduledMessageCountDto[];
  needsAttention: NeedsAttentionDto[];
}

export const DashboardStatsDtoSchema = z.object({
  generatedAt: z.string(),
  windowDays: z.number(),
  totals: DashboardTotalsDtoSchema,
  byChannel: z.array(ChannelBreakdownDtoSchema),
  byStatus: z.array(StatusBreakdownDtoSchema),
  volume: z.array(VolumePointDtoSchema),
  scheduledPosts: z.array(ScheduledPostCountDtoSchema),
  scheduledMessages: z.array(ScheduledMessageCountDtoSchema),
  needsAttention: z.array(NeedsAttentionDtoSchema),
});