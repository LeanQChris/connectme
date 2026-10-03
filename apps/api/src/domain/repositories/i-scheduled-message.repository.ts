import {
  ScheduledMessage,
  ScheduledMessageStatus,
  ChannelType,
} from "@connectme/database";

export interface ScheduledMessageFilter {
  status?: ScheduledMessageStatus;
  conversationId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface CreateScheduledMessageData {
  tenantId: string;
  conversationId: string;
  channel: ChannelType;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  scheduledFor: Date;
  createdBy?: string | null;
}

export interface IScheduledMessageRepository {
  create(data: CreateScheduledMessageData): Promise<ScheduledMessage>;
  findById(tenantId: string, id: string): Promise<ScheduledMessage | null>;
  list(tenantId: string, filter?: ScheduledMessageFilter): Promise<ScheduledMessage[]>;
  update(tenantId: string, id: string, partial: Partial<ScheduledMessage>): Promise<ScheduledMessage>;
  findDue(now: Date, limit: number): Promise<ScheduledMessage[]>;
}
