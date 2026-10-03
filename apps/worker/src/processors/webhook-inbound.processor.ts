import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ChannelType,
  ConnectedAccount,
  Contact,
  Conversation,
  MediaType,
  Message,
  MessageStatus,
  TenantCredential,
} from "@connectme/database";
import { INBOUND_WEBHOOKS_QUEUE } from "../queue.constants";
import { AesVaultService, fetchMetaProfile } from "@connectme/channels";import { RealtimePublisher } from "../realtime/realtime-publisher";
import {
  createMessage,
  findOrCreateConversation,
  touchConversation,
  upsertContact,
} from "./inbound-persist.helpers";

interface MetaEntry {
  id: string;
  changes?: Array<{ field: string; value: any }>;
  messaging?: any[];
}
interface MetaPayload {
  object: string;
  entry?: MetaEntry[];
}
interface TelegramPayload {
  update_id: number;
  message?: any;
}
interface DiscordPayload {
  id: string;
  application_id?: string;
  channel_id?: string;
  member?: { user?: any };
  user?: any;
  data?: { name?: string };
}

@Processor(INBOUND_WEBHOOKS_QUEUE, { concurrency: 8 })
export class WebhookInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookInboundProcessor.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(ConnectedAccount)
    private readonly accountRepo: Repository<ConnectedAccount>,
    @InjectRepository(TenantCredential)
    private readonly credRepo: Repository<TenantCredential>,
    private readonly aesVault: AesVaultService,
    private readonly realtime: RealtimePublisher,
  ) {
    super();
  }

  /** Resolve a usable page/bot token for outbound profile lookups. */
  private async tokenFor(tenantId: string, account: ConnectedAccount): Promise<string | null> {
    try {
      if (account.accessTokenEnc) {
        return this.aesVault.decryptStrict<string>(account.accessTokenEnc);
      }
      const creds = await this.credRepo.findOne({ where: { tenantId } });
      if (creds?.pageAccessTokenEnc) {
        return this.aesVault.decryptStrict<string>(creds.pageAccessTokenEnc);
      }
    } catch (err) {
      this.logger.warn(`Token unavailable for profile lookup: ${(err as Error).message}`);
    }
    return null;
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const payload = job.data?.payload;
    switch (job.name) {
      case "meta":
        return this.handleMeta(payload);
      case "telegram":
        return this.handleTelegram(job.data.botId, payload);
      case "discord":
        return this.handleDiscord(payload);
      default:
        this.logger.warn(`Unknown inbound job name: ${job.name}`);
    }
  }

  private graphVersion(): string {
    return process.env.META_GRAPH_VERSION || process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";
  }

  private async handleMeta(payload: MetaPayload): Promise<void> {
    if (!payload?.entry) return;
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field === "messages") await this.handleWhatsApp(change.value);
      }
      for (const event of entry.messaging || []) {
        await this.handleMessenger(entry.id, event, payload.object === "instagram");
      }
    }
  }

  private async accountTenant(channel: ChannelType, externalId: string) {
    return this.accountRepo.findOne({
      where: { channel, externalId, isActive: true },
    });
  }

  private async handleWhatsApp(value: any): Promise<void> {
    const phoneNumberId = value?.metadata?.phone_number_id;
    if (!phoneNumberId) return;
    const account = await this.accountTenant(ChannelType.WHATSAPP, phoneNumberId);
    if (!account?.tenantId) {
      this.logger.warn(`Dropping WhatsApp webhook for unregistered phone_number_id ${phoneNumberId}.`);
      return;
    }
    const tenantId = account.tenantId;

    for (const status of value.statuses || []) {
      const map: Record<string, MessageStatus> = {
        sent: MessageStatus.SENT,
        delivered: MessageStatus.DELIVERED,
        read: MessageStatus.READ,
        failed: MessageStatus.FAILED,
      };
      const mapped = map[status.status];
      if (!mapped) continue;
      const existing = await this.messageRepo
        .createQueryBuilder("m")
        .innerJoin("m.conversation", "c")
        .where("c.tenantId = :tenantId", { tenantId })
        .andWhere("m.externalId = :id", { id: status.id })
        .getOne();
      if (existing) {
        await this.messageRepo.update({ id: existing.id }, { status: mapped });
        await this.realtime.publish({
          type: "message:status",
          tenantId,
          payload: { messageId: status.id, status: mapped, externalId: status.id },
        });
      }
    }

    for (const msg of value.messages || []) {
      await this.ingestMetaMessage(tenantId, account, value, msg);
    }
  }

  private async ingestMetaMessage(
    tenantId: string,
    account: ConnectedAccount,
    value: any,
    msg: any,
  ): Promise<void> {
    const senderWaId = msg.from;
    const profileName =
      value.contacts?.find((c: any) => c.wa_id === senderWaId)?.profile?.name || senderWaId;

    const contact = await upsertContact(this.contactRepo, tenantId, ChannelType.WHATSAPP, senderWaId, {
      name: profileName,
      phoneNumber: senderWaId,
    });
    const conv = await findOrCreateConversation(this.convRepo, tenantId, contact.id, ChannelType.WHATSAPP, account.id);

    let bodyText: string | null = msg.text?.body || null;
    let mediaType: Message["type"] = MediaType.TEXT;
    let mediaId: string | null = null;
    let mediaMimeType: string | null = null;
    if (msg.type === "image") {
      mediaType = MediaType.IMAGE;
      bodyText = bodyText || "Photo";
      mediaId = msg.image?.id ?? null;
      mediaMimeType = msg.image?.mime_type ?? null;
    } else if (msg.type === "audio") {
      mediaType = MediaType.AUDIO;
      bodyText = bodyText || "Voice message";
      mediaId = msg.audio?.id ?? null;
      mediaMimeType = msg.audio?.mime_type ?? null;
    } else if (msg.type === "video") {
      mediaType = MediaType.VIDEO;
      bodyText = bodyText || "Video";
      mediaId = msg.video?.id ?? null;
      mediaMimeType = msg.video?.mime_type ?? null;
    } else if (msg.type === "document") {
      mediaType = MediaType.DOCUMENT;
      bodyText = bodyText || (msg.document?.filename || "Document");
      mediaId = msg.document?.id ?? null;
      mediaMimeType = msg.document?.mime_type ?? null;
    }

    const saved = await createMessage(this.messageRepo, {
      conversationId: conv.id,
      externalId: msg.id,
      channel: ChannelType.WHATSAPP,
      type: mediaType,
      text: bodyText,
      mediaMimeType,
    });
    void mediaId;

    await touchConversation(this.convRepo, conv, bodyText, true);
    await this.realtime.publish({
      type: "message:new",
      tenantId,
      payload: { conversationId: conv.id, message: saved },
    });
  }

  private async handleMessenger(pageId: string, event: any, isInstagram: boolean): Promise<void> {
    const channel = isInstagram ? ChannelType.INSTAGRAM : ChannelType.MESSENGER;
    const account = await this.accountTenant(channel, pageId);
    if (!account?.tenantId) {
      this.logger.warn(`Dropping ${channel} webhook for unregistered page ${pageId}.`);
      return;
    }
    const tenantId = account.tenantId;
    if (event?.read) return;

    const message = event?.message;
    if (!message) return;

    const senderId = event.sender?.id;
    if (!senderId) return;

    const text = message.text || (message.attachments?.length ? "Attachment" : "Message");
    const profile = await this.fetchProfile(tenantId, channel, senderId, account);
    const contact = await upsertContact(this.contactRepo, tenantId, channel, senderId, {
      name: profile?.name || profile?.username || senderId,
      avatarUrl: profile?.profile_pic,
    });
    const conv = await findOrCreateConversation(this.convRepo, tenantId, contact.id, channel, account.id);

    const saved = await createMessage(this.messageRepo, {
      conversationId: conv.id,
      externalId: message.mid ?? null,
      channel,
      type: message.attachments?.length ? MediaType.IMAGE : MediaType.TEXT,
      text,
    });
    await touchConversation(this.convRepo, conv, text, true);
    await this.realtime.publish({
      type: "message:new",
      tenantId,
      payload: { conversationId: conv.id, message: saved },
    });
  }

  /** Best-effort profile enrichment; never blocks ingestion on failure. */
  private async fetchProfile(
    tenantId: string,
    channel: ChannelType,
    externalId: string,
    account: ConnectedAccount,
  ): Promise<{ name?: string; username?: string; profile_pic?: string } | null> {
    if (channel !== ChannelType.MESSENGER && channel !== ChannelType.INSTAGRAM) return null;
    try {
      const token = await this.tokenFor(tenantId, account);
      if (!token) return null;
      return await fetchMetaProfile(externalId, token);
    } catch (err) {
      this.logger.warn(`Profile lookup failed for ${externalId}: ${(err as Error).message}`);
      return null;
    }
  }

  private async handleTelegram(botId: string, update: TelegramPayload): Promise<void> {
    if (!update?.message) return;
    const account = await this.accountTenant(ChannelType.TELEGRAM, botId);
    if (!account?.tenantId) {
      this.logger.warn(`Dropping Telegram webhook for unregistered bot ${botId}.`);
      return;
    }
    const tenantId = account.tenantId;
    const message = update.message;
    const chatId = String(message.chat.id);
    const senderName =
      message.from?.first_name || message.from?.username || `User ${chatId.slice(-4)}`;

    const contact = await upsertContact(this.contactRepo, tenantId, ChannelType.TELEGRAM, chatId, {
      name: senderName,
    });
    const conv = await findOrCreateConversation(this.convRepo, tenantId, contact.id, ChannelType.TELEGRAM, account.id);
    const text = message.text || (message.photo ? "Photo" : "Attachment");

    const saved = await createMessage(this.messageRepo, {
      conversationId: conv.id,
      externalId: String(message.message_id),
      channel: ChannelType.TELEGRAM,
      type: message.photo ? MediaType.IMAGE : MediaType.TEXT,
      text,
    });
    await touchConversation(this.convRepo, conv, text, true);
    await this.realtime.publish({
      type: "message:new",
      tenantId,
      payload: { conversationId: conv.id, message: saved },
    });
  }

  private async handleDiscord(interaction: DiscordPayload): Promise<void> {
    if (!interaction?.id) return;
    const account = interaction.application_id
      ? await this.accountTenant(ChannelType.DISCORD, interaction.application_id)
      : null;
    if (!account?.tenantId) {
      this.logger.warn(
        `Dropping Discord interaction for unregistered application ${interaction.application_id}.`,
      );
      return;
    }
    const tenantId = account.tenantId;
    const channelId = interaction.channel_id || "general";
    const user = interaction.member?.user || interaction.user;
    const senderName = user?.username || "Discord User";

    const contact = await upsertContact(this.contactRepo, tenantId, ChannelType.DISCORD, channelId, {
      name: senderName,
    });
    const conv = await findOrCreateConversation(this.convRepo, tenantId, contact.id, ChannelType.DISCORD);
    const text = `/${interaction.data?.name || "interaction"}`;

    const saved = await createMessage(this.messageRepo, {
      conversationId: conv.id,
      externalId: interaction.id,
      channel: ChannelType.DISCORD,
      type: MediaType.TEXT,
      text,
    });
    await touchConversation(this.convRepo, conv, text, true);
    await this.realtime.publish({
      type: "message:new",
      tenantId,
      payload: { conversationId: conv.id, message: saved },
    });
  }
}
