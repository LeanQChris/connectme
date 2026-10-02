import { Controller, Get, Query, Headers, Inject } from "@nestjs/common";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { IConversationRepository } from "../../domain/repositories/i-conversation.repository";
import { IMessageRepository } from "../../domain/repositories/i-message.repository";
import { MessagingWindowVO } from "../../domain/value-objects/messaging-window.vo";
import { SearchHitDto, Channel } from "@connectme/contracts";

@Controller("api/search")
export class SearchController {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    @Inject("IConversationRepository")
    private readonly convRepo: IConversationRepository,
    @Inject("IMessageRepository")
    private readonly messageRepo: IMessageRepository,
  ) {}

  private async resolveTenantId(headerTenantId?: string): Promise<string> {
    if (headerTenantId) return headerTenantId;
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
    return defaultTenant.id;
  }

  @Get()
  async search(
    @Headers("x-tenant-id") headerTenantId: string,
    @Query("q") query: string,
  ): Promise<SearchHitDto[]> {
    if (!query || !query.trim()) return [];

    const tenantId = await this.resolveTenantId(headerTenantId);
    const conversations = await this.convRepo.searchConversations(tenantId, query.trim());

    return conversations.map((conv) => {
      const windowVo = new MessagingWindowVO(conv.channel, conv.lastInboundAt);
      return {
        conversation: {
          id: conv.id,
          contactId: conv.contactId,
          channel: conv.channel.toLowerCase() as Channel,
          accountId: conv.accountId,
          accountName: conv.account?.name ?? null,
          contactName: conv.contact?.name || conv.contact?.externalId || "Contact",
          contactExternalId: conv.contact?.externalId || "",
          avatarUrl: conv.contact?.avatarUrl,
          lastMessage: conv.lastMessageText,
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
