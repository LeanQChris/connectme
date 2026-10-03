import { z } from "zod";
import { MessageTypeSchema } from "@connectme/contracts";

export const ReplyBodySchema = z
  .object({
    text: z.string().min(1).max(4096).optional(),
    mediaUrl: z.string().min(1).max(2048).optional(),
    type: MessageTypeSchema.optional(),
    author: z.string().min(1).max(128).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.text || d.mediaUrl), {
    message: "A reply must include text or a media URL.",
  });

export const NoteBodySchema = z.object({
  text: z.string().min(1).max(4096),
  author: z.string().min(1).max(128).optional(),
});

export const PresignBodySchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  contentType: z.string().min(1).max(128).optional(),
});

export const DisconnectBodySchema = z.object({
  accountId: z.string().min(1),
});

export const ChannelSchema = z.object({
  channel: z.enum(["whatsapp", "page", "telegram", "discord"]),
});

export const ProviderSecretsSchema = z
  .object({
    waPhoneNumberId: z.string().max(64).optional(),
    waAccessToken: z.string().max(4096).optional(),
    waAppId: z.string().max(64).optional(),
    waAppSecret: z.string().max(512).optional(),
    metaAppSecret: z.string().max(512).optional(),
    webhookVerifyToken: z.string().max(256).optional(),
    pageAccessToken: z.string().max(4096).optional(),
    telegramBotToken: z.string().max(512).optional(),
    telegramChannelId: z.string().max(64).optional(),
    discordBotToken: z.string().max(512).optional(),
    discordChannelId: z.string().max(64).optional(),
    discordPublicKey: z.string().max(128).optional(),
    graphVersion: z.string().max(16).optional(),
  })
  .strict();

export const SaveSettingsBodySchema = z.object({
  secrets: ProviderSecretsSchema,
});
