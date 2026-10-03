import { Message, MessageStatus } from "@connectme/database";

export interface IMessageRepository {
  findById(tenantId: string, id: string): Promise<Message | null>;
  findByExternalId(tenantId: string, externalId: string): Promise<Message | null>;
  findByConversationId(
    tenantId: string,
    conversationId: string,
    limit?: number,
  ): Promise<Message[]>;
  /** Keyset pagination: messages strictly older than `before` (ISO), newest first. */
  findMessagesPage(
    tenantId: string,
    conversationId: string,
    limit: number,
    before?: string,
  ): Promise<Message[]>;
  createMessage(tenantId: string, message: Partial<Message>): Promise<Message>;
  updateStatus(
    tenantId: string,
    id: string,
    status: MessageStatus,
    errorDetail?: string,
  ): Promise<Message | null>;
  updateStatusByExternalId(tenantId: string, externalId: string, status: MessageStatus, errorDetail?: string): Promise<Message | null>;
  searchMessages(tenantId: string, query: string): Promise<Message[]>;
}
