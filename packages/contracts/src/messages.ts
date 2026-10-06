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
  "sticker",
  "location",
  "file",
  "other",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];
export const MessageTypeSchema = z.enum(MESSAGE_TYPES);

export const MEDIA_KINDS = [
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "file",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const MediaKindSchema = z.enum(MEDIA_KINDS);

export interface MessageMedia {
  url: string;
  type: MediaKind;
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
}

export const MessageMediaSchema = z.object({
  url: z.string().min(1),
  type: MediaKindSchema,
  name: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  mimeType: z.string().nullable().optional(),
});

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
  media?: MessageMedia[] | null;
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
  media: z.array(MessageMediaSchema).nullable().optional(),
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
  media?: MessageMedia[];
  /**
   * Input-only convenience alias for a single attachment: it is normalised into
   * `media[]` on the way in and never stored or echoed back — `MessageDto` is
   * array-only since mediaUrl was retired from the messages table.
   */
  mediaUrl?: string;
  mediaType?: MessageType;
  author?: string;
}

export const SendMessageDtoSchema = z
  .object({
    conversationId: z.string().min(1),
    text: z.string().max(4096).optional(),
    media: z.array(MessageMediaSchema).optional(),
    mediaUrl: z.string().max(2048).optional(),
    mediaType: MessageTypeSchema.optional(),
    author: z.string().max(128).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.text || d.mediaUrl || (d.media && d.media.length > 0)), {
    message: "A message must include text, an attachment, or a media URL.",
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
