import type { Channel, ConversationStatus } from "@/core/types";
import type {
  ScheduledMessageStatus,
  ScheduledPostStatus,
} from "@/modules/scheduling/data/scheduling.types";

export interface DashboardTotals {
  openConversations: number;
  unreadMessages: number;
  needsAttention: number;
  replyWindowClosing: number;
  scheduledUpcoming: number;
  scheduledFailed: number;
  avgFirstResponseMs: number | null;
}

export interface ChannelBreakdown {
  channel: Channel;
  open: number;
  unread: number;
}

export interface StatusBreakdown {
  status: ConversationStatus;
  count: number;
}

export interface VolumePoint {
  date: string;
  inbound: number;
  outbound: number;
}

export interface ScheduledPostCount {
  status: ScheduledPostStatus;
  count: number;
}

export interface ScheduledMessageCount {
  status: ScheduledMessageStatus;
  count: number;
}

export interface AttentionItem {
  id: string;
  contactName: string;
  channel: Channel;
  unreadCount: number;
  lastMessageAt: string;
  replyWindowEndsAt: string | null;
  replyWindowOpen: boolean;
}

export interface DashboardStats {
  generatedAt: string;
  windowDays: number;
  totals: DashboardTotals;
  byChannel: ChannelBreakdown[];
  byStatus: StatusBreakdown[];
  volume: VolumePoint[];
  scheduledPosts: ScheduledPostCount[];
  scheduledMessages: ScheduledMessageCount[];
  needsAttention: AttentionItem[];
}

export const DASHBOARD_WINDOW_OPTIONS = [7, 14, 30] as const;
export type DashboardWindow = (typeof DASHBOARD_WINDOW_OPTIONS)[number];

/** Channels whose free-form reply window never expires. */
export const UNLIMITED_WINDOW_CHANNELS: Channel[] = ["telegram", "discord"];

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatShortDay(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}