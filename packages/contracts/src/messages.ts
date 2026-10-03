import { z } from "zod";
import { Channel, ChannelSchema } from "./channels";

export const DIRECTIONS = ["in", "out", "note"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DirectionSchema = z.enum(DIRECTIONS);

export const MESSAGE_TYPES = [
  "text",
  "image",
  "audio",
  "video",
  "document",
  "other",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];
export const MessageTypeSchema = z.enum(MESSAGE_TYPES);

export const MESSAGE_STATUSES = [
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export const MessageStatusSchema = z.enum(MESSAGE_STATUSES);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface MessageDto {
  id: string;
  conversationId: string;
  direction: Direction;
  type: MessageType;
  text: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaSize?: number | null;
  externalId: string | null;
  channel: Channel;
  status: MessageStatus;
  error?: string | null;
  author?: string | null;
  createdAt: string;
}

export const MessageDtoSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  direction: DirectionSchema,
  type: MessageTypeSchema,
  text: z.string().nullable(),
  mediaUrl: z.string().nullable().optional(),
  mediaMimeType: z.string().nullable().optional(),
  mediaSize: z.number().nullable().optional(),
  externalId: z.string().nullable().optional(),
  channel: ChannelSchema,
  status: MessageStatusSchema,
  error: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  createdAt: z.string(),
});

export interface SendMessageDto {
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: MessageType;
  author?: string;
}

export const SendMessageDtoSchema = z
  .object({
    conversationId: z.string().min(1),
    text: z.string().max(4096).optional(),
    mediaUrl: z.string().max(2048).optional(),
    mediaType: MessageTypeSchema.optional(),
    author: z.string().max(128).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.text || d.mediaUrl), {
    message: "A message must include text or a media URL.",
  });

export interface AddInternalNoteDto {
  conversationId: string;
  text: string;
  author?: string;
}

export const AddInternalNoteDtoSchema = z
  .object({
    conversationId: z.string().min(1),
    text: z.string().min(1).max(4096),
    author: z.string().max(128).optional(),
  })
  .strict();
