import { z } from "zod";
import { Channel, ChannelSchema } from "./channels";
import { MessageDto, MessageDtoSchema } from "./messages";

export const CONVERSATION_STATUSES = ["open", "closed", "snoozed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
export const ConversationStatusSchema = z.enum(CONVERSATION_STATUSES);

export interface ReplyWindowDto {
  open: boolean;
  msRemaining: number | null;
}

export interface ConversationSummaryDto {
  id: string;
  contactId: string;
  channel: Channel;
  accountId?: string | null;
  accountName?: string | null;
  contactName: string;
  contactExternalId: string;
  avatarUrl?: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  lastInboundAt: string | null;
  unreadCount: number;
  lastReadAt: string | null;
  assignee: string | null;
  tags: string[];
  status: ConversationStatus;
  window: ReplyWindowDto;
}

export const ConversationSummaryDtoSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  channel: ChannelSchema,
  accountId: z.string().nullable().optional(),
  accountName: z.string().nullable().optional(),
  contactName: z.string(),
  contactExternalId: z.string(),
  avatarUrl: z.string().nullable().optional(),
  lastMessage: z.string().nullable(),
  lastMessageAt: z.string(),
  lastInboundAt: z.string().nullable(),
  unreadCount: z.number(),
  lastReadAt: z.string().nullable(),
  assignee: z.string().nullable(),
  tags: z.array(z.string()),
  status: ConversationStatusSchema,
  window: z.object({
    open: z.boolean(),
    msRemaining: z.number().nullable(),
  }),
});

export interface ConversationDetailDto {
  conversation: ConversationSummaryDto;
  messages: MessageDto[];
}

export const ConversationDetailDtoSchema = z.object({
  conversation: ConversationSummaryDtoSchema,
  messages: z.array(MessageDtoSchema),
});

export interface SearchHitDto {
  conversation: ConversationSummaryDto;
  snippet: string;
  createdAt: string;
  direction: "in" | "out" | "note";
}

export interface UpdateConversationDto {
  status?: ConversationStatus;
  assignee?: string | null;
  tags?: string[];
}

export const UpdateConversationDtoSchema = z
  .object({
    status: ConversationStatusSchema.optional(),
    assignee: z.string().max(128).nullable().optional(),
    tags: z.array(z.string().max(64)).max(20).optional(),
  })
  .strict();
