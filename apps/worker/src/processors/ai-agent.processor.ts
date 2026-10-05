import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, UnrecoverableError } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import {
  ChannelType,
  ConnectedAccount,
  Conversation,
  MediaType,
  Message,
  MessageDirection,
  MessageStatus,
  TenantCredential,
} from "@connectme/database";
import {
  AesVaultService,
  WhatsAppClient,
  MessengerClient,
  InstagramClient,
  TelegramClient,
  DiscordClient,
  type ChannelSendContext,
} from "@connectme/channels";
import { AI_AGENT_QUEUE, AiAgentJobData } from "../queue.constants";
import { RealtimePublisher } from "../realtime/realtime-publisher";
import { AiAgentService } from "../services/ai-agent.service";
import { touchConversation } from "./inbound-persist.helpers";

const META_WINDOW_MS = 24 * 60 * 60 * 1000;
const META_WINDOW_CHANNELS = [
  ChannelType.WHATSAPP,
  ChannelType.MESSENGER,
  ChannelType.INSTAGRAM,
];
const AI_AGENT_AUTHOR = "AI Agent";

@Processor(AI_AGENT_QUEUE)
export class AiAgentProcessor extends WorkerHost {
  private readonly logger = new Logger(AiAgentProcessor.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(TenantCredential)
    private readonly credentialRepo: Repository<TenantCredential>,
    @InjectRepository(ConnectedAccount)
    private readonly accountRepo: Repository<ConnectedAccount>,
    private readonly vault: AesVaultService,
    private readonly aiAgentService: AiAgentService,
    private readonly realtime: RealtimePublisher,
    private readonly whatsappClient: WhatsAppClient,
    private readonly messengerClient: MessengerClient,
    private readonly instagramClient: InstagramClient,
    private readonly telegramClient: TelegramClient,
    private readonly discordClient: DiscordClient,
  ) {
    super();
  }

  async process(job: Job<AiAgentJobData>): Promise<any> {
    const data = job.data;
    const { tenantId } = data;

    const conv = await this.convRepo.findOne({
      where: { id: data.conversationId, tenantId },
      relations: ["contact", "account"],
    });
    if (!conv || !conv.contact) {
      this.logger.warn(`AI agent: conversation ${data.conversationId} not found; skipping.`);
      return;
    }

    const triggering = await this.messageRepo.findOne({
      where: { id: data.messageId, conversationId: conv.id },
    });
    if (!triggering) {
      this.logger.warn(`AI agent: triggering message ${data.messageId} not found; skipping.`);
      return;
    }
    if (triggering.direction !== MessageDirection.INBOUND) {
      return;
    }

    if (!(await this.aiAgentService.isAutoReplyEnabled(tenantId))) {
      this.logger.log(`AI agent: auto-reply disabled for tenant ${tenantId}; skipping.`);
      return;
    }

    // Idempotency: skip if another AI reply was already created after this message.
    const alreadyReplied = await this.messageRepo.findOne({
      where: {
        conversationId: conv.id,
        direction: MessageDirection.OUTBOUND,
        authorName: AI_AGENT_AUTHOR,
        createdAt: MoreThan(triggering.createdAt),
      },
    });
    if (alreadyReplied) {
      this.logger.log(`AI agent: reply already exists for message ${data.messageId}; skipping.`);
      return;
    }

    const recent = await this.messageRepo.find({
      where: { conversationId: conv.id },
      order: { createdAt: "DESC" },
      take: 12,
    });
    const lastMessages = recent.reverse().map((m) => ({
      direction: m.direction,
      text: m.text ?? null,
    }));

    const text = await this.aiAgentService.generateReply(tenantId, {
      contactName: conv.contact.name,
      channel: conv.channel,
      lastMessages,
    });
    if (!text) {
      this.logger.log(`AI agent: no reply generated for conversation ${conv.id}; skipping.`);
      return;
    }

    const tag = this.resolveMetaTag(conv);

    const credentials = await this.credentialRepo.findOne({ where: { tenantId } });
    const ctx: ChannelSendContext = {
      credentials,
      pageAccessToken: conv.account?.accessTokenEnc ?? null,
      contactExternalId: conv.contact.externalId,
      text,
      tag,
    };

    let externalId: string | null = null;
    switch (conv.channel) {
      case ChannelType.WHATSAPP:
        externalId = (await this.whatsappClient.sendText(ctx)).externalId;
        break;
      case ChannelType.MESSENGER:
        externalId = (await this.messengerClient.sendText(ctx)).externalId;
        break;
      case ChannelType.INSTAGRAM:
        externalId = (await this.instagramClient.sendText(ctx)).externalId;
        break;
      case ChannelType.TELEGRAM:
        externalId = (await this.telegramClient.sendText(ctx)).externalId;
        break;
      case ChannelType.DISCORD:
        externalId = (await this.discordClient.sendText(ctx)).externalId;
        break;
      default:
        throw new UnrecoverableError(`Unsupported channel ${conv.channel} for AI auto-reply.`);
    }

    const saved = this.messageRepo.create({
      conversationId: conv.id,
      direction: MessageDirection.OUTBOUND,
      channel: conv.channel,
      type: MediaType.TEXT,
      text,
      status: MessageStatus.SENT,
      authorName: AI_AGENT_AUTHOR,
      externalId,
    });
    await this.messageRepo.save(saved);

    const savedConv = await touchConversation(this.convRepo, conv, text, false);

    await this.realtime.publish({
      type: "message:new",
      tenantId,
      payload: { conversationId: conv.id, message: saved },
    });
    await this.realtime.publish({
      type: "conversation:update",
      tenantId,
      payload: { conversation: savedConv },
    });

    this.logger.log(`AI agent replied in conversation ${conv.id} (externalId=${externalId}).`);
  }

  /** Resolve a Meta message tag or throw when the reply window forbids sending. */
  private resolveMetaTag(conv: Conversation): string | undefined {
    if (!META_WINDOW_CHANNELS.includes(conv.channel)) return undefined;

    const last = conv.lastInboundAt ? new Date(conv.lastInboundAt).getTime() : 0;
    const closed = !last || Date.now() - last > META_WINDOW_MS;
    if (!closed) return undefined;

    if (conv.channel === ChannelType.MESSENGER || conv.channel === ChannelType.INSTAGRAM) {
      // HUMAN_AGENT tag permits a reply up to 7 days after the last user message.
      return "HUMAN_AGENT";
    }
    throw new UnrecoverableError(
      "24-hour reply window closed; cannot auto-reply on WhatsApp.",
    );
  }
}
