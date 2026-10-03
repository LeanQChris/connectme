import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Conversation,
  ConversationStatus,
  Message,
  MessageDirection,
  ScheduledMessage,
  ScheduledPost,
  ChannelType,
} from "@connectme/database";
import {
  AttentionRow,
  ChannelRollup,
  ConversationTotals,
  IStatsRepository,
  StatsWindow,
  StatusCountRow,
  StatusRollup,
  VolumeBucket,
  REPLY_WINDOW_MS,
  REPLY_WINDOW_URGENT_MS,
  UNLIMITED_WINDOW_CHANNELS,
} from "../../../domain/repositories/i-stats.repository";

@Injectable()
export class TypeOrmStatsRepository implements IStatsRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(ScheduledPost)
    private readonly postRepo: Repository<ScheduledPost>,
    @InjectRepository(ScheduledMessage)
    private readonly scheduledMessageRepo: Repository<ScheduledMessage>,
  ) {}

  async getConversationTotals(
    tenantId: string,
    window: StatsWindow,
  ): Promise<ConversationTotals> {
    const urgentThreshold = new Date(
      window.now.getTime() - REPLY_WINDOW_MS + REPLY_WINDOW_URGENT_MS,
    );
    const windowThreshold = new Date(window.now.getTime() - REPLY_WINDOW_MS);

    const raw = await this.convRepo
      .createQueryBuilder("c")
      .select("COUNT(*) FILTER (WHERE c.status = :open)", "openConversations")
      .addSelect("COALESCE(SUM(c.unreadCount), 0)", "unreadMessages")
      .addSelect(
        "COUNT(*) FILTER (WHERE c.status = :open AND c.unreadCount > 0)",
        "needsAttention",
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE c.status = :open
          AND c.unreadCount > 0
          AND c.lastInboundAt IS NOT NULL
          AND c.lastInboundAt <= :urgentThreshold
          AND c.lastInboundAt >= :windowThreshold
          AND c.channel NOT IN (:...unlimitedChannels))`,
        "replyWindowClosing",
      )
      .where("c.tenantId = :tenantId", { tenantId })
      .setParameters({
        open: ConversationStatus.OPEN,
        urgentThreshold,
        windowThreshold,
        unlimitedChannels: UNLIMITED_WINDOW_CHANNELS,
      })
      .getRawOne<{
        openConversations: string;
        unreadMessages: string;
        needsAttention: string;
        replyWindowClosing: string;
      }>();

    return {
      openConversations: Number(raw?.openConversations ?? 0),
      unreadMessages: Number(raw?.unreadMessages ?? 0),
      needsAttention: Number(raw?.needsAttention ?? 0),
      replyWindowClosing: Number(raw?.replyWindowClosing ?? 0),
    };
  }

  async getChannelRollup(tenantId: string): Promise<ChannelRollup[]> {
    const rows = await this.convRepo
      .createQueryBuilder("c")
      .select("c.channel", "channel")
      .addSelect("COUNT(*) FILTER (WHERE c.status = :open)", "open")
      .addSelect("COALESCE(SUM(c.unreadCount), 0)", "unread")
      .where("c.tenantId = :tenantId", { tenantId })
      .setParameters({ open: ConversationStatus.OPEN })
      .groupBy("c.channel")
      .orderBy("c.channel", "ASC")
      .getRawMany<{ channel: ChannelType; open: string; unread: string }>();

    return rows.map((row) => ({
      channel: row.channel,
      open: Number(row.open),
      unread: Number(row.unread),
    }));
  }

  async getStatusRollup(tenantId: string): Promise<StatusRollup[]> {
    const rows = await this.convRepo
      .createQueryBuilder("c")
      .select("c.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("c.tenantId = :tenantId", { tenantId })
      .groupBy("c.status")
      .orderBy("c.status", "ASC")
      .getRawMany<{ status: ConversationStatus; count: string }>();

    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
  }

  async getMessageVolume(tenantId: string, since: Date): Promise<VolumeBucket[]> {
    const dayExpr = `to_char(date_trunc('day', m.createdAt), 'YYYY-MM-DD')`;
    const rows = await this.messageRepo
      .createQueryBuilder("m")
      .innerJoin("m.conversation", "c")
      .select(dayExpr, "date")
      .addSelect("m.direction", "direction")
      .addSelect("COUNT(*)", "count")
      .where("c.tenantId = :tenantId", { tenantId })
      .andWhere("m.createdAt >= :since", { since })
      .andWhere("m.direction IN (:...directions)", {
        directions: [MessageDirection.INBOUND, MessageDirection.OUTBOUND],
      })
      .groupBy(dayExpr)
      .addGroupBy("m.direction")
      .orderBy(dayExpr, "ASC")
      .getRawMany<{ date: string; direction: MessageDirection; count: string }>();

    return rows.map((row) => ({
      date: row.date,
      direction: row.direction,
      count: Number(row.count),
    }));
  }

  /**
   * Pairs every inbound message with the first outbound message that followed it
   * in the same conversation. Written as raw SQL with explicitly quoted
   * identifiers because the lateral subquery aliases are unknown to the
   * QueryBuilder's property replacer.
   *
   * The join is `>=` rather than `>` so that a reply landing in the same
   * millisecond as its inbound message counts as a response, instead of being
   * skipped and attributed to a much later outbound. Inbound and outbound can
   * never be the same row, so `>=` cannot pair a message with itself.
   */
  async getAverageFirstResponseMs(tenantId: string, since: Date): Promise<number | null> {
    const rows = await this.messageRepo.query<{ avg_ms: string | null }[]>(
      `
      SELECT AVG(EXTRACT(EPOCH FROM (r.first_reply_at - r.inbound_at)) * 1000)::bigint AS avg_ms
      FROM (
        SELECT m."createdAt" AS inbound_at, o."createdAt" AS first_reply_at
        FROM messages m
        INNER JOIN conversations c ON c."id" = m."conversationId"
        LEFT JOIN LATERAL (
          SELECT m2."createdAt"
          FROM messages m2
          WHERE m2."conversationId" = m."conversationId"
            AND m2."direction" = $3
            AND m2."createdAt" >= m."createdAt"
          ORDER BY m2."createdAt" ASC
          LIMIT 1
        ) o ON TRUE
        WHERE c."tenantId" = $1
          AND m."direction" = $2
          AND m."createdAt" >= $4
      ) r
      WHERE r.first_reply_at IS NOT NULL
      `,
      [tenantId, MessageDirection.INBOUND, MessageDirection.OUTBOUND, since],
    );

    const avg = rows?.[0]?.avg_ms;
    return avg === null || avg === undefined ? null : Math.round(Number(avg));
  }

  async getScheduledPostCounts(tenantId: string): Promise<StatusCountRow[]> {
    const rows = await this.postRepo
      .createQueryBuilder("p")
      .select("p.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("p.tenantId = :tenantId", { tenantId })
      .groupBy("p.status")
      .getRawMany<StatusCountRow>();

    return rows.map((row) => ({ ...row, count: Number(row.count) }));
  }

  async getScheduledMessageCounts(tenantId: string): Promise<StatusCountRow[]> {
    const rows = await this.scheduledMessageRepo
      .createQueryBuilder("sm")
      .select("sm.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("sm.tenantId = :tenantId", { tenantId })
      .groupBy("sm.status")
      .getRawMany<StatusCountRow>();

    return rows.map((row) => ({ ...row, count: Number(row.count) }));
  }

  async getNeedsAttention(tenantId: string, window: StatsWindow): Promise<AttentionRow[]> {
    const windowThreshold = new Date(window.now.getTime() - REPLY_WINDOW_MS);

    const rows = await this.convRepo
      .createQueryBuilder("c")
      .leftJoin("c.contact", "contact")
      .select("c.id", "id")
      .addSelect("COALESCE(contact.name, contact.externalId, 'Unknown')", "contactName")
      .addSelect("c.channel", "channel")
      .addSelect("c.unreadCount", "unreadCount")
      .addSelect("c.lastMessageAt", "lastMessageAt")
      .addSelect("c.lastInboundAt", "lastInboundAt")
      .where("c.tenantId = :tenantId", { tenantId })
      .andWhere("c.status = :open", { open: ConversationStatus.OPEN })
      .andWhere("c.unreadCount > 0")
      .andWhere(
        "(c.lastInboundAt IS NULL OR c.lastInboundAt >= :windowThreshold)",
        { windowThreshold },
      )
      .orderBy("c.lastMessageAt", "DESC")
      .take(window.attentionLimit)
      .getRawMany<{
        id: string;
        contactName: string;
        channel: ChannelType;
        unreadCount: number;
        lastMessageAt: Date;
        lastInboundAt: Date | null;
      }>();

    return rows.map((row) => ({
      id: row.id,
      contactName: row.contactName,
      channel: row.channel,
      unreadCount: Number(row.unreadCount),
      lastMessageAt: new Date(row.lastMessageAt),
      lastInboundAt: row.lastInboundAt ? new Date(row.lastInboundAt) : null,
    }));
  }
}