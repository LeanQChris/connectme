import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { IConversationRepository } from "../../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../../domain/repositories/i-message.repository";
import { MessagingWindowVO } from "../../../domain/value-objects/messaging-window.vo";
import {
  ConversationDetailDto,
  ConversationSummaryDto,
  MessageDto,
  Channel,
  Direction,
  MessageType,
  MessageStatus,
} from "@connectme/contracts";

@Injectable()
export class GetConversationDetailUseCase {
  constructor(
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IMessageRepository")
    private readonly messageRepo: IMessageRepository,
  ) {}

  async execute(tenantId: string, conversationId: string): Promise<ConversationDetailDto> {
    const conv = await this.convRepo.findById(tenantId, conversationId);
    if (!conv) {
      throw new NotFoundException("Conversation not found");
    }

    // Automatically mark as read
    await this.convRepo.markAsRead(tenantId, conversationId);

    const messages = await this.messageRepo.findByConversationId(conversationId, 200);
    const windowVo = new MessagingWindowVO(conv.channel, conv.lastInboundAt);
    const window = windowVo.calculate();

    const summary: ConversationSummaryDto = {
      id: conv.id,
      contactId: conv.contactId,
      channel: conv.channel.toLowerCase() as Channel,
      accountId: conv.accountId,
      accountName: conv.account?.name ?? null,
      contactName: conv.contact.name || conv.contact.externalId,
      contactExternalId: conv.contact.externalId,
      avatarUrl: conv.contact.avatarUrl,
      lastMessage: conv.lastMessageText,
      lastMessageAt: conv.lastMessageAt.toISOString(),
      lastInboundAt: conv.lastInboundAt ? conv.lastInboundAt.toISOString() : null,
      unreadCount: 0,
      lastReadAt: new Date().toISOString(),
      assignee: conv.assignee ? (conv.assignee.firstName || conv.assignee.email) : null,
      tags: conv.tags || [],
      status: conv.status.toLowerCase() as any,
      window,
    };

    const messageDtos: MessageDto[] = messages.map((m) => {
      let dir: Direction = "in";
      if (m.direction === "OUTBOUND") dir = "out";
      if (m.direction === "INTERNAL_NOTE") dir = "note";

      return {
        id: m.id,
        conversationId: m.conversationId,
        direction: dir,
        type: m.type.toLowerCase() as MessageType,
        text: m.text,
        mediaUrl: m.mediaUrl,
        mediaMimeType: m.mediaMimeType,
        mediaSize: m.mediaSize,
        externalId: m.externalId,
        channel: m.channel.toLowerCase() as Channel,
        status: m.status.toLowerCase() as MessageStatus,
        error: m.errorDetail,
        author: m.authorName,
        createdAt: m.createdAt.toISOString(),
      };
    });

    return {
      conversation: summary,
      messages: messageDtos,
    };
  }
}
