import { z } from "zod";
import { Channel, ChannelSchema } from "./channels";
import { MessageType, MessageTypeSchema } from "./messages";

export const SCHEDULED_MESSAGE_STATUSES = [
  "pending",
  "sent",
  "failed",
  "canceled",
] as const;
export type ScheduledMessageStatus = (typeof SCHEDULED_MESSAGE_STATUSES)[number];
export const ScheduledMessageStatusSchema = z.enum(SCHEDULED_MESSAGE_STATUSES);

export interface ScheduledMessageDto {
  id: string;
  tenantId: string;
  conversationId: string;
  channel: Channel;
  text: string | null;
  mediaUrl: string | null;
  mediaType: MessageType | null;
  scheduledFor: string;
  status: ScheduledMessageStatus;
  attempts: number;
  lastError: string | null;
  externalId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ScheduledMessageDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  conversationId: z.string(),
  channel: ChannelSchema,
  text: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  mediaType: MessageTypeSchema.nullable(),
  scheduledFor: z.string(),
  status: ScheduledMessageStatusSchema,
  attempts: z.number(),
  lastError: z.string().nullable(),
  externalId: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export interface CreateScheduledMessageDto {
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: MessageType;
  scheduledFor: string;
  timezone?: string;
  createdBy?: string;
}

export const CreateScheduledMessageDtoSchema = z
  .object({
    conversationId: z.string().min(1),
    text: z.string().max(4096).optional(),
    mediaUrl: z.string().max(2048).optional(),
    mediaType: MessageTypeSchema.optional(),
    scheduledFor: z.string().datetime({ offset: true }),
    timezone: z.string().max(64).optional(),
    createdBy: z.string().max(128).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.text || d.mediaUrl), {
    message: "A scheduled message must include text or a media URL.",
  });
