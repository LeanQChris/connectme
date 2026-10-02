import { Message, MessageStatus } from "@connectme/database";

export interface IMessageRepository {
  findById(id: string): Promise<Message | null>;
  findByExternalId(externalId: string): Promise<Message | null>;
  findByConversationId(conversationId: string, limit?: number): Promise<Message[]>;
  createMessage(message: Partial<Message>): Promise<Message>;
  updateStatus(id: string, status: MessageStatus, errorDetail?: string): Promise<Message>;
  updateStatusByExternalId(externalId: string, status: MessageStatus, errorDetail?: string): Promise<Message | null>;
  searchMessages(tenantId: string, query: string): Promise<Message[]>;
}
