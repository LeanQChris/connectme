import { Conversation, ConversationStatus, ChannelType } from "@connectme/database";

export interface ListConversationsFilter {
  channel?: ChannelType;
  status?: ConversationStatus;
  assigneeId?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface IConversationRepository {
  findById(tenantId: string, id: string): Promise<Conversation | null>;
  findByContactId(tenantId: string, contactId: string): Promise<Conversation | null>;
  findOrCreateForContact(
    tenantId: string,
    contactId: string,
    channel: ChannelType,
    accountId?: string | null,
  ): Promise<Conversation>;
  listConversations(tenantId: string, filter?: ListConversationsFilter): Promise<Conversation[]>;
  updateStatus(tenantId: string, conversationId: string, status: ConversationStatus): Promise<Conversation>;
  setAssignee(tenantId: string, conversationId: string, assigneeId: string | null): Promise<Conversation>;
  setTags(tenantId: string, conversationId: string, tags: string[]): Promise<Conversation>;
  markAsRead(tenantId: string, conversationId: string): Promise<Conversation>;
  updateLastMessage(
    tenantId: string,
    conversationId: string,
    text: string | null,
    inbound: boolean,
  ): Promise<Conversation>;
  delete(tenantId: string, id: string): Promise<boolean>;
  searchConversations(tenantId: string, query: string): Promise<Conversation[]>;
}
