import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  ChannelType,
  MessageDirection,
  MessageStatus,
  MediaType,
} from "@connectme/database";
import { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";
import { IContactRepository } from "../../../domain/repositories/i-contact.repository";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../../domain/repositories/i-message.repository";
import { InboxRealtimeGateway } from "../../../presentation/gateways/inbox-realtime.gateway";
import { SlackClient, AesVaultService } from "@connectme/channels";

@Injectable()
export class ProcessInboundSlackUseCase {
  private readonly logger = new Logger(ProcessInboundSlackUseCase.name);

  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IContactRepository")
    private readonly contactRepo: IContactRepository,
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IMessageRepository")
    private readonly messageRepo: IMessageRepository,
    private readonly slackClient: SlackClient,
    private readonly aesVault: AesVaultService,
    private readonly realtimeGateway: InboxRealtimeGateway,
  ) {}

  async execute(tenantId: string, payload: any) {
    // Handle Slack URL verification challenge
    if (payload?.type === "url_verification") {
      return { challenge: payload.challenge };
    }

    const event = payload?.event;
    if (!event || event.subtype === "bot_message" || event.bot_id) {
      // Ignore bot messages to prevent echo loops
      return { status: "ignored" };
    }

    const channelId = event.channel;
    const userId = event.user;
    if (!channelId || !userId) {
      return { status: "ignored" };
    }

    const externalMessageId = event.ts ? String(event.ts) : null;
    if (externalMessageId) {
      const existing = await this.messageRepo.findByExternalId(tenantId, externalMessageId);
      if (existing) {
        return { status: "duplicate" };
      }
    }

    // Resolve user name / contact
    const credentials = await this.tenantRepo.getCredentials(tenantId);
    let contactName = userId;
    let contactAvatar: string | undefined;

    if (credentials?.slackBotTokenEnc) {
      const token = this.aesVault.decryptStrict<string>(credentials.slackBotTokenEnc);
      const userInfo = await this.slackClient.getUserInfo(userId, token);
      if (userInfo) {
        contactName = userInfo.name || contactName;
        contactAvatar = userInfo.avatarUrl;
      }
    }

    const contact = await this.contactRepo.upsertContact(
      tenantId,
      ChannelType.SLACK,
      channelId,
      {
        name: contactName,
        avatarUrl: contactAvatar,
      },
    );

    const conv = await this.convRepo.findOrCreateForContact(
      tenantId,
      contact.id,
      ChannelType.SLACK,
      null,
    );

    // Extract files & media
    const files = event.files || [];
    const mediaList = files.map((f: any) => ({
      url: f.url_private_download || f.url_private,
      name: f.name || f.title || "slack-file",
      type: f.mimetype?.startsWith("image/") ? "image" : "file",
      mimeType: f.mimetype,
      size: f.size,
    }));

    const text = event.text || "";
    const primaryMediaUrl = mediaList[0]?.url || null;

    const msg = await this.messageRepo.createMessage(tenantId, {
      conversationId: conv.id,
      externalId: externalMessageId,
      direction: MessageDirection.INBOUND,
      channel: ChannelType.SLACK,
      type: mediaList.length > 0 ? (mediaList[0].type === "image" ? MediaType.IMAGE : MediaType.DOCUMENT) : MediaType.TEXT,
      text: text || null,
      mediaUrl: primaryMediaUrl,
      media: mediaList.length > 0 ? mediaList : null,
      status: MessageStatus.RECEIVED,
      authorName: contactName,
    });

    const preview = text || (mediaList.length > 0 ? `📎 ${mediaList.length} attachment(s)` : "Slack message");
    await this.convRepo.updateLastMessage(tenantId, conv.id, preview, true);

    this.realtimeGateway.broadcastNewMessage(tenantId, conv.id, msg);
    return { status: "processed", messageId: msg.id };
  }
}
