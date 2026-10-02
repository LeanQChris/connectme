import { Injectable, Inject } from "@nestjs/common";
import {
  IConversationRepository,
  ListConversationsFilter,
} from "../../../domain/repositories/i-conversation.repository";
import { MessagingWindowVO } from "../../../domain/value-objects/messaging-window.vo";
import { ConversationSummaryDto, Channel } from "@connectme/contracts";

@Injectable()
export class ListConversationsUseCase {
  constructor(
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
  ) {}

  async execute(tenantId: string, filter?: ListConversationsFilter): Promise<ConversationSummaryDto[]> {
    const list = await this.convRepo.listConversations(tenantId, filter);

    return list.map((conv) => {
      const windowVo = new MessagingWindowVO(conv.channel, conv.lastInboundAt);
      const window = windowVo.calculate();

      return {
        id: conv.id,
        contactId: conv.contactId,
        channel: conv.channel.toLowerCase() as Channel,
        accountId: conv.accountId ?? null,
        accountName: conv.account?.name ?? null,
        contactName: conv.contact.name || conv.contact.externalId,
        contactExternalId: conv.contact.externalId,
        avatarUrl: conv.contact.avatarUrl ?? null,
        lastMessage: conv.lastMessageText ?? null,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        lastInboundAt: conv.lastInboundAt ? conv.lastInboundAt.toISOString() : null,
        unreadCount: conv.unreadCount,
        lastReadAt: conv.lastReadAt ? conv.lastReadAt.toISOString() : null,
        assignee: conv.assignee ? (conv.assignee.firstName || conv.assignee.email) : null,
        tags: conv.tags || [],
        status: conv.status.toLowerCase() as any,
        window,
      };
    });
  }
}
