import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job, UnrecoverableError } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ChannelType,
  Message,
  MessageStatus,
  Conversation,
  ConnectedAccount,
  TenantCredential,
} from "@connectme/database";
import {
  WhatsAppClient,
  MessengerClient,
  InstagramClient,
  TelegramClient,
  DiscordClient,
  ChannelSendContext,
} from "@connectme/channels";
import { OUTBOUND_RETRY_QUEUE, OutboundRetryJobData } from "../queue.constants";
import { RealtimePublisher } from "../realtime/realtime-publisher";

/**
 * Retries immediate (non-scheduled) outbound sends that failed with a transient
 * error in the API. The API persists the Message and enqueues a retry; this
 * processor loads it, re-dispatches on the matching channel and marks it
 * DELIVERED. Mirrors `outbound-scheduler.processor.ts` send handling.
 */
@Processor(OUTBOUND_RETRY_QUEUE)
export class OutboundRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundRetryProcessor.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConnectedAccount)
    private readonly accountRepo: Repository<ConnectedAccount>,
    @InjectRepository(TenantCredential)
    private readonly credRepo: Repository<TenantCredential>,
    private readonly whatsappClient: WhatsAppClient,
    private readonly messengerClient: MessengerClient,
    private readonly instagramClient: InstagramClient,
    private readonly telegramClient: TelegramClient,
    private readonly discordClient: DiscordClient,
    private readonly realtime: RealtimePublisher,
  ) {
    super();
  }

  async process(job: Job<OutboundRetryJobData>): Promise<any> {
    const data = job.data;

    const msg = await this.messageRepo.findOne({ where: { id: data.messageId } });
    if (!msg) {
      this.logger.warn(`Outbound retry: message ${data.messageId} not found; skipping.`);
      return;
    }

    const conv = await this.conversationRepo.findOne({
      where: { id: msg.conversationId, tenantId: data.tenantId },
      relations: ["contact", "account"],
    });
    if (!conv || !conv.contact) {
      this.logger.warn(
        `Outbound retry: conversation ${msg.conversationId} missing or tenant mismatch; skipping.`,
      );
      return;
    }

    // Idempotency: delivery already confirmed (e.g. a prior attempt succeeded).
    if (
      msg.status === MessageStatus.DELIVERED ||
      msg.status === MessageStatus.READ
    ) {
      this.logger.log(`Outbound retry: message ${msg.id} already ${msg.status}; skipping.`);
      return;
    }

    const credentials = await this.credRepo.findOne({ where: { tenantId: data.tenantId } });
    const ctx: ChannelSendContext = {
      credentials,
      pageAccessToken: conv.account?.accessTokenEnc ?? null,
      contactExternalId: conv.contact.externalId,
      text: msg.text ?? undefined,
      mediaUrl: msg.mediaUrl ?? undefined,
      media: msg.media ?? undefined,
      type: msg.type,
    };

    const useMedia = Boolean(msg.mediaUrl || (msg.media && msg.media.length > 0));

    try {
      let externalId: string | null = null;
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

      msg.status = MessageStatus.DELIVERED;
      msg.externalId = externalId;
      msg.errorDetail = null;
      await this.messageRepo.save(msg);

      conv.lastMessageText = msg.text || "Attachment";
      conv.lastMessageAt = new Date();
      await this.conversationRepo.save(conv);

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

      this.logger.log(`Outbound retry: message ${msg.id} delivered (externalId=${externalId}).`);
    } catch (err: any) {
      if (err instanceof UnrecoverableError) {
        await this.markFailed(msg, conv, data.tenantId, err);
        throw err;
      }

      const attempts = job.opts?.attempts ?? 1;
      if (job.attemptsMade + 1 >= attempts) {
        await this.markFailed(msg, conv, data.tenantId, err);
      }
      throw err;
    }
  }

  private async markFailed(
    msg: Message,
    conv: Conversation,
    tenantId: string,
    err: any,
  ): Promise<void> {
    const detail = err?.message || "Retry dispatch failed";
    msg.status = MessageStatus.FAILED;
    msg.errorDetail = detail;
    await this.messageRepo.save(msg);
    await this.realtime.publish({
      type: "message:new",
      tenantId,
      payload: { conversationId: conv.id, message: msg },
    });
    this.logger.error(`Outbound retry: message ${msg.id} failed permanently: ${detail}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<OutboundRetryJobData> | undefined, err: Error): void {
    if (!job) return;
    this.logger.error(
      `Dead-letter: outbound-retry job ${job.id} failed permanently: ${err.message}`,
    );
  }
}
