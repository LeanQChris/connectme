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
  SlackClient,
} from "@connectme/channels";
import { InboxRealtimeGateway } from "../../../presentation/gateways/inbox-realtime.gateway";

export interface SendReplyMediaItem {
  url: string;
  type?: string;
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
}

export interface SendReplyInput {
  tenantId: string;
  conversationId: string;
  text?: string;
  media?: SendReplyMediaItem[];
  mediaUrl?: string;
  mediaType?: string;
  author?: string;
}

function resolveMediaType(mediaType?: string, media?: SendReplyMediaItem[]): MediaType {
  if (media && media.length > 0) {
    const first = media[0];
    if (first.type) {
      const upper = first.type.toUpperCase();
      if ((Object.values(MediaType) as string[]).includes(upper)) {
        return upper as MediaType;
      }
    }
    return MediaType.IMAGE;
  }
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
    private readonly slackClient: SlackClient,
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

    // Normalize media list
    const mediaList = input.media && input.media.length > 0
      ? input.media
      : input.mediaUrl
      ? [{ url: input.mediaUrl, type: input.mediaType || "file" }]
      : [];

    const primaryMediaUrl = mediaList[0]?.url || input.mediaUrl || null;

    // Save preliminary outbound message
    const msg = await this.messageRepo.createMessage(input.tenantId, {
      conversationId: conv.id,
      direction: MessageDirection.OUTBOUND,
      channel: conv.channel,
      type: resolveMediaType(input.mediaType, input.media),
      text: input.text || null,
      mediaUrl: primaryMediaUrl,
      media: mediaList.length > 0 ? mediaList.map((m) => ({
        url: m.url,
        type: m.type || "file",
        name: m.name ?? undefined,
        size: m.size ?? undefined,
        mimeType: m.mimeType ?? undefined,
      })) : null,
      status: MessageStatus.SENT,
      authorName: input.author || "Agent",
    });

    let delivered = true;
    let skipped: string[] | undefined;

    try {
      let externalId: string | null = null;
      const ctx = {
        credentials,
        pageAccessToken: conv.account?.accessTokenEnc,
        contactExternalId: conv.contact.externalId,
        text: input.text,
        mediaUrl: primaryMediaUrl ?? undefined,
        media: mediaList,
        mimeType: undefined,
        type: input.mediaType,
      };

      const useMedia = mediaList.length > 0;
      switch (conv.channel) {
        case ChannelType.WHATSAPP: {
          const res = await (useMedia ? this.whatsappClient.sendMedia(ctx) : this.whatsappClient.sendText(ctx));
          externalId = res.externalId;
          skipped = res.skipped;
          break;
        }
        case ChannelType.MESSENGER: {
          const res = await (useMedia ? this.messengerClient.sendMedia(ctx) : this.messengerClient.sendText(ctx));
          externalId = res.externalId;
          skipped = res.skipped;
          break;
        }
        case ChannelType.INSTAGRAM: {
          const res = await (useMedia ? this.instagramClient.sendMedia(ctx) : this.instagramClient.sendText(ctx));
          externalId = res.externalId;
          skipped = res.skipped;
          break;
        }
        case ChannelType.TELEGRAM: {
          const res = await (useMedia ? this.telegramClient.sendMedia(ctx) : this.telegramClient.sendText(ctx));
          externalId = res.externalId;
          skipped = res.skipped;
          break;
        }
        case ChannelType.DISCORD: {
          const res = await (useMedia ? this.discordClient.sendMedia(ctx) : this.discordClient.sendText(ctx));
          externalId = res.externalId;
          skipped = res.skipped;
          break;
        }
        case ChannelType.SLACK: {
          const res = await (useMedia ? this.slackClient.sendMedia(ctx) : this.slackClient.sendText(ctx));
          externalId = res.externalId;
          skipped = res.skipped;
          break;
        }
        case ChannelType.WIDGET: {
          externalId = `widget_${Date.now()}`;
          break;
        }
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
      const previewText = input.text || (mediaList.length > 0 ? `📎 ${mediaList.length} attachment(s)` : "Attachment");
      await this.convRepo.updateLastMessage(input.tenantId, conv.id, previewText, false);
    }

    // Real-time broadcast (including failed messages, so the UI reflects reality)
    this.realtimeGateway.broadcastNewMessage(input.tenantId, conv.id, msg);

    if (!delivered) {
      throw new BadGatewayException(
        msg.errorDetail || `Failed to deliver message on ${conv.channel.toLowerCase()}`,
      );
    }

    return { ...msg, skipped };
  }
}
