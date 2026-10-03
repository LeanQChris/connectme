import { ChannelType, ConversationStatus, MessageDirection } from "@connectme/database";

export interface ChannelRollup {
  channel: ChannelType;
  open: number;
  unread: number;
}

export interface StatusRollup {
  status: ConversationStatus;
  count: number;
}

export interface VolumeBucket {
  date: string;
  direction: MessageDirection;
  count: number;
}

export interface StatusCountRow {
  status: string;
  count: number;
}

export interface AttentionRow {
  id: string;
  contactName: string;
  channel: ChannelType;
  unreadCount: number;
  lastMessageAt: Date;
  lastInboundAt: Date | null;
}

/** Free-form replies are only allowed for 24h after the last inbound message. */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** A reply window this close to expiry is surfaced as urgent. */
export const REPLY_WINDOW_URGENT_MS = 2 * 60 * 60 * 1000;

/** Channels whose free-form reply window never expires. */
export const UNLIMITED_WINDOW_CHANNELS: ChannelType[] = [
  ChannelType.TELEGRAM,
  ChannelType.DISCORD,
];

export interface ConversationTotals {
  openConversations: number;
  unreadMessages: number;
  needsAttention: number;
  replyWindowClosing: number;
}

export interface StatsWindow {
  since: Date;
  now: Date;
  attentionLimit: number;
}

export interface IStatsRepository {
  getConversationTotals(
    tenantId: string,
    window: StatsWindow,
  ): Promise<ConversationTotals>;
  getChannelRollup(tenantId: string): Promise<ChannelRollup[]>;
  getStatusRollup(tenantId: string): Promise<StatusRollup[]>;
  getMessageVolume(tenantId: string, since: Date): Promise<VolumeBucket[]>;
  getAverageFirstResponseMs(tenantId: string, since: Date): Promise<number | null>;
  getScheduledPostCounts(tenantId: string): Promise<StatusCountRow[]>;
  getScheduledMessageCounts(tenantId: string): Promise<StatusCountRow[]>;
  getNeedsAttention(tenantId: string, window: StatsWindow): Promise<AttentionRow[]>;
}