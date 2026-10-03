import {
  Injectable,
  BadRequestException,
  NotFoundException,
  BadGatewayException,
  Inject,
} from "@nestjs/common";
import {
  MessageDirection,
  MessageStatus,
  MediaType,
  ChannelType,
} from "@connectme/database";
import { ITenantRepository } from "../../../domain/repositories/i-tenant.repository";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../../domain/repositories/i-message.repository";
import { MessagingWindowVO } from "../../../domain/value-objects/messaging-window.vo";
import {
  WhatsAppClient,
  MessengerClient,
  InstagramClient,
  TelegramClient,
  DiscordClient,
} from "@connectme/channels";
import { InboxRealtimeGateway } from "../../../presentation/gateways/inbox-realtime.gateway";

export interface SendReplyInput {
  tenantId: string;
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  author?: string;
}

function resolveMediaType(mediaType?: string): MediaType {
  if (!mediaType) return MediaType.TEXT;
  const upper = mediaType.toUpperCase();
  return (Object.values(MediaType) as string[]).includes(upper)
    ? (upper as MediaType)
    : MediaType.TEXT;
}

@Injectable()
export class SendReplyUseCase {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IMessageRepository")
    private readonly messageRepo: IMessageRepository,
    private readonly whatsappClient: WhatsAppClient,
    private readonly messengerClient: MessengerClient,
    private readonly instagramClient: InstagramClient,
    private readonly telegramClient: TelegramClient,
    private readonly discordClient: DiscordClient,
    private readonly realtimeGateway: InboxRealtimeGateway,
  ) {}

  async execute(input: SendReplyInput) {
    const conv = await this.convRepo.findById(input.tenantId, input.conversationId);
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }

    // Check 24-hour customer service window rule
    const windowVo = new MessagingWindowVO(conv.channel, conv.lastInboundAt);
    const windowState = windowVo.calculate();
    if (!windowState.open) {
      throw new BadRequestException(
        "The 24-hour reply window for this contact is closed. You must wait for an inbound message or use an approved template.",
      );
    }

    const credentials = await this.tenantRepo.getCredentials(input.tenantId);

    // Save preliminary outbound message
    const msg = await this.messageRepo.createMessage(input.tenantId, {
      conversationId: conv.id,
      direction: MessageDirection.OUTBOUND,
      channel: conv.channel,
      type: resolveMediaType(input.mediaType),
      text: input.text || null,
      mediaUrl: input.mediaUrl || null,
      status: MessageStatus.SENT,
      authorName: input.author || "Agent",
    });

    let delivered = true;
    try {
      let externalId: string | null = null;
      const ctx = {
        credentials,
        pageAccessToken: conv.account?.accessTokenEnc,
        contactExternalId: conv.contact.externalId,
        text: input.text,
        mediaUrl: input.mediaUrl,
        mimeType: undefined,
        type: input.mediaType,
      };

      const useMedia = Boolean(input.mediaUrl);
      switch (conv.channel) {
        case ChannelType.WHATSAPP:
          externalId = (
            await (useMedia
              ? this.whatsappClient.sendMedia(ctx)
              : this.whatsappClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.MESSENGER:
          externalId = (
            await (useMedia
              ? this.messengerClient.sendMedia(ctx)
              : this.messengerClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.INSTAGRAM:
          externalId = (
            await (useMedia
              ? this.instagramClient.sendMedia(ctx)
              : this.instagramClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.TELEGRAM:
          externalId = (
            await (useMedia
              ? this.telegramClient.sendMedia(ctx)
              : this.telegramClient.sendText(ctx))
          ).externalId;
          break;
        case ChannelType.DISCORD:
          externalId = (
            await (useMedia
              ? this.discordClient.sendMedia(ctx)
              : this.discordClient.sendText(ctx))
          ).externalId;
          break;
        default:
          throw new Error(`Unsupported channel: ${conv.channel}`);
      }

      msg.externalId = externalId;
      msg.status = MessageStatus.DELIVERED;
      await this.messageRepo.updateStatus(input.tenantId, msg.id, MessageStatus.DELIVERED);
    } catch (err: any) {
      delivered = false;
      msg.status = MessageStatus.FAILED;
      msg.errorDetail = err.message || "Failed to dispatch message to channel";
      await this.messageRepo.updateStatus(input.tenantId, msg.id, MessageStatus.FAILED, msg.errorDetail ?? undefined);
    }

    if (delivered) {
      // Update conversation last message timestamp & snippet
      await this.convRepo.updateLastMessage(input.tenantId, conv.id, input.text || "Attachment", false);
    }

    // Real-time broadcast (including failed messages, so the UI reflects reality)
    this.realtimeGateway.broadcastNewMessage(input.tenantId, conv.id, msg);

    if (!delivered) {
      throw new BadGatewayException(
        msg.errorDetail || `Failed to deliver message on ${conv.channel.toLowerCase()}`,
      );
    }

    return msg;
  }
}
