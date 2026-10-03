import { Inject, Injectable } from "@nestjs/common";
import {
  ChannelType,
  ConversationStatus,
  MessageDirection,
  ScheduledMessageStatus,
  ScheduledPostStatus,
} from "@connectme/database";
import {
  DashboardStatsDto,
  NeedsAttentionDto,
  VolumePointDto,
} from "@connectme/contracts";
import {
  IStatsRepository,
  REPLY_WINDOW_MS,
  StatsWindow,
} from "../../../domain/repositories/i-stats.repository";

export const DASHBOARD_MIN_WINDOW_DAYS = 7;
export const DASHBOARD_MAX_WINDOW_DAYS = 90;
export const DASHBOARD_DEFAULT_WINDOW_DAYS = 14;
export const DASHBOARD_ATTENTION_LIMIT = 8;

function clampWindowDays(days: number): number {
  if (!Number.isFinite(days)) return DASHBOARD_DEFAULT_WINDOW_DAYS;
  return Math.min(DASHBOARD_MAX_WINDOW_DAYS, Math.max(DASHBOARD_MIN_WINDOW_DAYS, Math.trunc(days)));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject("IStatsRepository") private readonly statsRepo: IStatsRepository,
  ) {}

  async execute(tenantId: string, requestedWindowDays?: number): Promise<DashboardStatsDto> {
    const windowDays = clampWindowDays(requestedWindowDays ?? DASHBOARD_DEFAULT_WINDOW_DAYS);
    const now = new Date();
    const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const window: StatsWindow = { since, now, attentionLimit: DASHBOARD_ATTENTION_LIMIT };

    const [
      totals,
      byChannel,
      byStatus,
      volumeBuckets,
      avgFirstResponseMs,
      scheduledPosts,
      scheduledMessages,
      needsAttentionRows,
    ] = await Promise.all([
      this.statsRepo.getConversationTotals(tenantId, window),
      this.statsRepo.getChannelRollup(tenantId),
      this.statsRepo.getStatusRollup(tenantId),
      this.statsRepo.getMessageVolume(tenantId, since),
      this.statsRepo.getAverageFirstResponseMs(tenantId, since),
      this.statsRepo.getScheduledPostCounts(tenantId),
      this.statsRepo.getScheduledMessageCounts(tenantId),
      this.statsRepo.getNeedsAttention(tenantId, window),
    ]);

    const postCounts = new Map(scheduledPosts.map((row) => [row.status, row.count]));
    const messageCounts = new Map(scheduledMessages.map((row) => [row.status, row.count]));

    return {
      generatedAt: now.toISOString(),
      windowDays,
      totals: {
        ...totals,
        scheduledUpcoming:
          (postCounts.get(ScheduledPostStatus.PENDING) ?? 0) +
          (postCounts.get(ScheduledPostStatus.SCHEDULED) ?? 0) +
          (messageCounts.get(ScheduledMessageStatus.PENDING) ?? 0),
        scheduledFailed:
          (postCounts.get(ScheduledPostStatus.FAILED) ?? 0) +
          (messageCounts.get(ScheduledMessageStatus.FAILED) ?? 0),
        avgFirstResponseMs,
      },
      byChannel: Object.values(ChannelType).map((channel) => {
        const row = byChannel.find((item) => item.channel === channel);
        return {
          channel: channel.toLowerCase() as DashboardStatsDto["byChannel"][number]["channel"],
          open: row?.open ?? 0,
          unread: row?.unread ?? 0,
        };
      }),
      byStatus: Object.values(ConversationStatus).map((status) => ({
        status: status.toLowerCase() as DashboardStatsDto["byStatus"][number]["status"],
        count: byStatus.find((item) => item.status === status)?.count ?? 0,
      })),
      volume: this.fillVolumeDays(volumeBuckets, windowDays, now),
      scheduledPosts: Object.values(ScheduledPostStatus).map((status) => ({
        status: status.toLowerCase() as DashboardStatsDto["scheduledPosts"][number]["status"],
        count: postCounts.get(status) ?? 0,
      })),
      scheduledMessages: Object.values(ScheduledMessageStatus).map((status) => ({
        status: status.toLowerCase() as DashboardStatsDto["scheduledMessages"][number]["status"],
        count: messageCounts.get(status) ?? 0,
      })),
      needsAttention: needsAttentionRows.map((row): NeedsAttentionDto => {
        const endsAt = row.lastInboundAt
          ? new Date(row.lastInboundAt.getTime() + REPLY_WINDOW_MS)
          : null;
        return {
          id: row.id,
          contactName: row.contactName,
          channel: row.channel.toLowerCase() as NeedsAttentionDto["channel"],
          unreadCount: row.unreadCount,
          lastMessageAt: row.lastMessageAt.toISOString(),
          replyWindowEndsAt: endsAt ? endsAt.toISOString() : null,
          replyWindowOpen: endsAt ? endsAt.getTime() > now.getTime() : true,
        };
      }),
    };
  }

  private fillVolumeDays(
    buckets: Array<{ date: string; direction: MessageDirection; count: number }>,
    windowDays: number,
    now: Date,
  ): VolumePointDto[] {
    const byDate = new Map<string, { inbound: number; outbound: number }>();

    for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
      const day = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
      byDate.set(isoDay(day), { inbound: 0, outbound: 0 });
    }

    for (const bucket of buckets) {
      const entry = byDate.get(bucket.date);
      if (!entry) continue;
      if (bucket.direction === MessageDirection.INBOUND) entry.inbound += bucket.count;
      if (bucket.direction === MessageDirection.OUTBOUND) entry.outbound += bucket.count;
    }

    return [...byDate.entries()].map(([date, counts]) => ({ date, ...counts }));
  }
}