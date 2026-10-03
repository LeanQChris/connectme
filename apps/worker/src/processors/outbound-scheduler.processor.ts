import { Processor, WorkerHost, InjectQueue, OnWorkerEvent } from "@nestjs/bullmq";
import { Job, Queue, UnrecoverableError } from "bullmq";
import { Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, Repository } from "typeorm";
import {
  ChannelType,
  MediaType,
  MessageDirection,
  MessageStatus,
  ScheduleMode,
  ScheduledMessage,
  ScheduledMessageStatus,
  ScheduledPost,
  ScheduledPostStatus,
  Conversation,
  ConnectedAccount,
  TenantCredential,
  Message,
} from "@connectme/database";
import {
  WhatsAppClient,
  MessengerClient,
  InstagramClient,
  TelegramClient,
  DiscordClient,
  FacebookPostClient,
  InstagramPostClient,
  TelegramPostClient,
  DiscordPostClient,
  ChannelSendContext,
  PostPublishContext,
} from "@connectme/channels";
import { OUTBOUND_SCHEDULER_QUEUE, ScheduledJobData } from "../queue.constants";
import { RealtimePublisher } from "../realtime/realtime-publisher";

const META_WINDOW_MS = 24 * 60 * 60 * 1000;
const META_WINDOW_CHANNELS = [
  ChannelType.WHATSAPP,
  ChannelType.MESSENGER,
  ChannelType.INSTAGRAM,
];

@Processor(OUTBOUND_SCHEDULER_QUEUE)
export class OutboundSchedulerProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(OutboundSchedulerProcessor.name);

  constructor(
    @InjectQueue(OUTBOUND_SCHEDULER_QUEUE)
    private readonly queue: Queue,
    @InjectRepository(ScheduledPost)
    private readonly scheduledPostRepo: Repository<ScheduledPost>,
    @InjectRepository(ScheduledMessage)
    private readonly scheduledMessageRepo: Repository<ScheduledMessage>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConnectedAccount)
    private readonly accountRepo: Repository<ConnectedAccount>,
    @InjectRepository(TenantCredential)
    private readonly credRepo: Repository<TenantCredential>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly whatsappClient: WhatsAppClient,
    private readonly messengerClient: MessengerClient,
    private readonly instagramClient: InstagramClient,
    private readonly telegramClient: TelegramClient,
    private readonly discordClient: DiscordClient,
    private readonly facebookPostClient: FacebookPostClient,
    private readonly instagramPostClient: InstagramPostClient,
    private readonly telegramPostClient: TelegramPostClient,
    private readonly discordPostClient: DiscordPostClient,
    private readonly realtime: RealtimePublisher,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.upsertJobScheduler(
        "reconcile",
        { every: 5 * 60_000 },
        { name: "reconcile", data: {}, opts: { removeOnComplete: true } },
      );
    } catch (err: any) {
      this.logger.warn(`Failed to register reconcile job: ${err?.message}`);
    }
  }

  async process(job: Job<ScheduledJobData, any, string>): Promise<any> {
    if (job.name === "reconcile") return this.reconcile();
    const data = job.data;
    if (data.kind === "message") return this.processMessage(job, data);
    return this.processPost(job, data);
  }

  /**
   * Re-enqueue due items that are still PENDING/SCHEDULED but have no live job
   * (e.g. Redis restart). BullMQ jobId uniqueness prevents duplicates.
   */
  private async reconcile(): Promise<void> {
    const cutoff = new Date(Date.now() - 2 * 60_000);
    const dueMessages = await this.scheduledMessageRepo.find({
      where: { status: ScheduledMessageStatus.PENDING, scheduledFor: LessThanOrEqual(cutoff) },
      take: 100,
    });
    for (const m of dueMessages) {
      await this.queue.add(
        "message",
        { kind: "message", id: m.id, tenantId: m.tenantId },
        {
          jobId: m.id,
          delay: 0,
          attempts: 8,
          backoff: { type: "exponential", delay: 60_000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }

    const duePosts = await this.scheduledPostRepo.find({
      where: {
        status: In([ScheduledPostStatus.PENDING, ScheduledPostStatus.SCHEDULED]),
        scheduledFor: LessThanOrEqual(cutoff),
      },
      take: 100,
    });
    for (const p of duePosts) {
      await this.queue.add(
        "post",
        { kind: "post", id: p.id, tenantId: p.tenantId },
        {
          jobId: p.id,
          delay: 0,
          attempts: 8,
          backoff: { type: "exponential", delay: 60_000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }

    if (dueMessages.length || duePosts.length) {
      this.logger.log(
        `Reconciled ${dueMessages.length} message(s) and ${duePosts.length} post(s).`,
      );
    }
  }

  private isFinalAttempt(job: Job): boolean {
    const attempts = job.opts?.attempts ?? 1;
    return job.attemptsMade + 1 >= attempts;
  }

  private async processMessage(job: Job<ScheduledJobData>, data: ScheduledJobData) {
    const row = await this.scheduledMessageRepo.findOne({
      where: { id: data.id, tenantId: data.tenantId },
    });
    if (!row) {
      this.logger.warn(`Scheduled message ${data.id} not found; skipping.`);
      return;
    }
    if (row.status !== ScheduledMessageStatus.PENDING) {
      this.logger.log(`Scheduled message ${row.id} is ${row.status}; skipping.`);
      return;
    }

    const conv = await this.conversationRepo.findOne({
      where: { id: row.conversationId, tenantId: data.tenantId },
      relations: ["contact", "account"],
    });
    if (!conv || !conv.contact) {
      await this.scheduledMessageRepo.update({ id: row.id, tenantId: data.tenantId }, {
        status: ScheduledMessageStatus.FAILED,
        lastError: "Conversation or contact missing.",
      });
      throw new UnrecoverableError("Conversation or contact missing.");
    }

    let tag: string | undefined;
    if (META_WINDOW_CHANNELS.includes(conv.channel)) {
      const last = conv.lastInboundAt ? new Date(conv.lastInboundAt).getTime() : 0;
      const closed = !last || Date.now() - last > META_WINDOW_MS;
      if (closed) {
        if (conv.channel === ChannelType.MESSENGER || conv.channel === ChannelType.INSTAGRAM) {
          // HUMAN_AGENT tag permits a reply up to 7 days after the last user message.
          tag = "HUMAN_AGENT";
        } else {
          const detail =
            "The 24-hour reply window is closed for this contact. Wait for an inbound message or use an approved template.";
          await this.scheduledMessageRepo.update({ id: row.id, tenantId: data.tenantId }, {
            status: ScheduledMessageStatus.FAILED,
            lastError: detail,
          });
          await this.realtime.publish({
            type: "scheduled:update",
            tenantId: data.tenantId,
            payload: {
              item: { kind: "message", id: row.id, status: ScheduledMessageStatus.FAILED, lastError: detail },
            },
          });
          throw new UnrecoverableError(detail);
        }
      }
    }

    const credentials = await this.credRepo.findOne({ where: { tenantId: data.tenantId } });
    const ctx: ChannelSendContext = {
      credentials,
      pageAccessToken: conv.account?.accessTokenEnc ?? null,
      contactExternalId: conv.contact.externalId,
      text: row.text ?? undefined,
      mediaUrl: row.mediaUrl ?? undefined,
      type: row.mediaType ?? undefined,
      tag,
    };

    try {
      let externalId: string | null = null;
      const useMedia = Boolean(row.mediaUrl);
      switch (conv.channel) {
        case ChannelType.WHATSAPP:
          externalId = (
            await (useMedia ? this.whatsappClient.sendMedia(ctx) : this.whatsappClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.MESSENGER:
          externalId = (
            await (useMedia ? this.messengerClient.sendMedia(ctx) : this.messengerClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.INSTAGRAM:
          externalId = (
            await (useMedia ? this.instagramClient.sendMedia(ctx) : this.instagramClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.TELEGRAM:
          externalId = (
            await (useMedia ? this.telegramClient.sendMedia(ctx) : this.telegramClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.DISCORD:
          externalId = (
            await (useMedia ? this.discordClient.sendMedia(ctx) : this.discordClient.sendText(ctx))
          ).externalId;
          break;
        default:
          throw new UnrecoverableError(`Unsupported channel ${conv.channel}.`);
      }

      const msg = this.messageRepo.create({
        conversationId: conv.id,
        direction: MessageDirection.OUTBOUND,
        channel: conv.channel,
        type: (row.mediaType?.toUpperCase() as MediaType) || MediaType.TEXT,
        text: row.text,
        mediaUrl: row.mediaUrl,
        status: MessageStatus.SENT,
        authorName: row.createdBy || "Scheduled",
        externalId,
      });
      await this.messageRepo.save(msg);

      conv.lastMessageText = row.text || "Attachment";
      conv.lastMessageAt = new Date();
      await this.conversationRepo.save(conv);

      await this.scheduledMessageRepo.update({ id: row.id, tenantId: data.tenantId }, {
        status: ScheduledMessageStatus.SENT,
        externalId,
        attempts: row.attempts + 1,
      });

      await this.realtime.publish({
        type: "message:new",
        tenantId: data.tenantId,
        payload: { conversationId: conv.id, message: msg },
      });
      await this.realtime.publish({
        type: "conversation:update",
        tenantId: data.tenantId,
        payload: { conversation: conv },
      });
      await this.realtime.publish({
        type: "scheduled:update",
        tenantId: data.tenantId,
        payload: { item: { kind: "message", id: row.id, status: ScheduledMessageStatus.SENT } },
      });

      this.logger.log(`Scheduled message ${row.id} sent (externalId=${externalId}).`);
    } catch (err: any) {
      await this.recordFailure(this.scheduledMessageRepo, data.tenantId, row.id, job, row.attempts, err);
      await this.realtime.publish({
        type: "scheduled:update",
        tenantId: data.tenantId,
        payload: {
          item: {
            kind: "message",
            id: row.id,
            status: this.isFinalAttempt(job) ? ScheduledMessageStatus.FAILED : ScheduledMessageStatus.PENDING,
            lastError: err?.message || "Dispatch failed",
          },
        },
      });
      throw err;
    }
  }

  private async processPost(job: Job<ScheduledJobData>, data: ScheduledJobData) {
    const row = await this.scheduledPostRepo.findOne({
      where: { id: data.id, tenantId: data.tenantId },
    });
    if (!row) {
      this.logger.warn(`Scheduled post ${data.id} not found; skipping.`);
      return;
    }
    if (
      row.status !== ScheduledPostStatus.PENDING &&
      row.status !== ScheduledPostStatus.SCHEDULED
    ) {
      return;
    }

    const account = row.accountId
      ? await this.accountRepo.findOne({ where: { id: row.accountId, tenantId: data.tenantId } })
      : null;
    if (!account) {
      await this.scheduledPostRepo.update({ id: row.id, tenantId: data.tenantId }, {
        status: ScheduledPostStatus.FAILED,
        lastError: "Connected account missing.",
      });
      throw new UnrecoverableError("Connected account missing.");
    }

    const client =
      row.channel === ChannelType.MESSENGER
        ? this.facebookPostClient
        : row.channel === ChannelType.INSTAGRAM
          ? this.instagramPostClient
          : row.channel === ChannelType.TELEGRAM
            ? this.telegramPostClient
            : row.channel === ChannelType.DISCORD
              ? this.discordPostClient
              : null;
    if (!client) {
      await this.scheduledPostRepo.update({ id: row.id, tenantId: data.tenantId }, {
        status: ScheduledPostStatus.FAILED,
        lastError: "Unsupported channel for post scheduling.",
      });
      throw new UnrecoverableError("Unsupported channel for post scheduling.");
    }

    const credentials = await this.credRepo.findOne({ where: { tenantId: data.tenantId } });
    const ctx: PostPublishContext = {
      accountExternalId: account.externalId,
      credentials,
      accessTokenEnc: account.accessTokenEnc,
      caption: row.caption ?? undefined,
      mediaUrls: row.mediaUrls ?? [],
      kind: row.kind,
      scheduledFor: row.scheduledFor,
    };

    try {
      if (row.mode === ScheduleMode.NATIVE) {
        const published = row.platformPostId
          ? await client.isPublished(ctx, row.platformPostId)
          : false;
        if (published) {
          await this.scheduledPostRepo.update({ id: row.id, tenantId: data.tenantId }, { status: ScheduledPostStatus.PUBLISHED });
          await this.realtime.publish({
            type: "scheduled:update",
            tenantId: data.tenantId,
            payload: { item: { kind: "post", id: row.id, status: ScheduledPostStatus.PUBLISHED } },
          });
          this.logger.log(`Native post ${row.id} confirmed published.`);
          return;
        }
        const graceMs = 30 * 60 * 1000;
        if (Date.now() > new Date(row.scheduledFor).getTime() + graceMs) {
          const detail = "Platform did not confirm the native scheduled post within 30 minutes.";
          await this.scheduledPostRepo.update({ id: row.id, tenantId: data.tenantId }, {
            status: ScheduledPostStatus.FAILED,
            lastError: detail,
          });
          throw new UnrecoverableError(detail);
        }
        throw new Error("Native post not yet confirmed published.");
      }

      const result = await client.publishNow(ctx);
      await this.scheduledPostRepo.update({ id: row.id, tenantId: data.tenantId }, {
        status: ScheduledPostStatus.PUBLISHED,
        platformPostId: result.platformPostId,
        platformContainerId: result.platformContainerId,
        attempts: row.attempts + 1,
      });
      await this.realtime.publish({
        type: "scheduled:update",
        tenantId: data.tenantId,
        payload: { item: { kind: "post", id: row.id, status: ScheduledPostStatus.PUBLISHED } },
      });
      this.logger.log(`Scheduled post ${row.id} published (id=${result.platformPostId}).`);
    } catch (err: any) {
      if (err instanceof UnrecoverableError) throw err;
      await this.recordFailure(this.scheduledPostRepo, data.tenantId, row.id, job, row.attempts, err);
      await this.realtime.publish({
        type: "scheduled:update",
        tenantId: data.tenantId,
        payload: {
          item: {
            kind: "post",
            id: row.id,
            status: this.isFinalAttempt(job) ? ScheduledPostStatus.FAILED : ScheduledPostStatus.PENDING,
            lastError: err?.message || "Dispatch failed",
          },
        },
      });
      throw err;
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ScheduledJobData> | undefined, err: Error): void {
    if (!job) return;
    this.logger.error(
      `Dead-letter: job ${job.name}:${job.id} failed permanently: ${err.message}`,
    );
  }

  private async recordFailure(
    repo: Repository<any>,
    tenantId: string,
    id: string,
    job: Job,
    attemptsBefore: number,
    err: any,
  ): Promise<void> {
    const isFinal = this.isFinalAttempt(job);
    const detail = err?.message || "Dispatch failed";
    await repo.update({ id, tenantId }, {
      attempts: attemptsBefore + 1,
      lastError: detail,
      ...(isFinal ? { status: "FAILED" } : {}),
    });
    this.logger.error(`Dispatch failed for ${id} (final=${isFinal}): ${detail}`);
  }
}
