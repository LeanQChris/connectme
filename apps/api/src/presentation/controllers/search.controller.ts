import { Controller, Get, Query } from "@nestjs/common";
import { IConversationRepository } from "../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../domain/repositories/i-message.repository";
import { MessagingWindowVO } from "../../domain/value-objects/messaging-window.vo";
import { SearchHitDto, Channel } from "@connectme/contracts";
import { TenantId } from "../auth/tenant-id.decorator";

@Controller("api/search")
export class SearchController {
  constructor(
    private readonly convRepo: IConversationRepository,
    private readonly messageRepo: IMessageRepository,
  ) {}

  @Get()
  async search(
    @TenantId() tenantId: string,
    @Query("q") query: string,
  ): Promise<SearchHitDto[]> {
    if (!query || !query.trim()) return [];

    const conversations = await this.convRepo.searchConversations(tenantId, query.trim());

    return conversations.map((conv) => {
      const windowVo = new MessagingWindowVO(conv.channel, conv.lastInboundAt);
      return {
        conversation: {
          id: conv.id,
          contactId: conv.contactId,
          channel: conv.channel.toLowerCase() as Channel,
          accountId: conv.accountId ?? null,
          accountName: conv.account?.name ?? null,
          contactName: conv.contact?.name || conv.contact?.externalId || "Contact",
          contactExternalId: conv.contact?.externalId || "",
          avatarUrl: conv.contact?.avatarUrl ?? null,
          lastMessage: conv.lastMessageText ?? null,
          lastMessageAt: conv.lastMessageAt.toISOString(),
          lastInboundAt: conv.lastInboundAt ? conv.lastInboundAt.toISOString() : null,
          unreadCount: conv.unreadCount,
          lastReadAt: conv.lastReadAt ? conv.lastReadAt.toISOString() : null,
          assignee: conv.assignee ? (conv.assignee.firstName || conv.assignee.email) : null,
          tags: conv.tags || [],
          status: conv.status.toLowerCase() as any,
          window: windowVo.calculate(),
        },
        snippet: conv.lastMessageText || "",
        createdAt: conv.lastMessageAt.toISOString(),
        direction: "in",
      };
    });
  }
}
