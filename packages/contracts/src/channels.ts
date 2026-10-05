import { z } from "zod";

export const CHANNELS = [
  "whatsapp",
  "messenger",
  "instagram",
  "telegram",
  "discord",
  "slack",
  "widget",
] as const;
export type Channel = (typeof CHANNELS)[number];
export const ChannelSchema = z.enum(CHANNELS);

export type ChannelProvider =
  | "meta"
  | "telegram"
  | "telegram-channel"
  | "discord"
  | "discord-channel"
  | "slack"
  | "widget";
export const ChannelProviderSchema = z.enum([
  "meta",
  "telegram",
  "telegram-channel",
  "discord",
  "discord-channel",
  "slack",
  "widget",
]);

export interface ConnectedAccountDto {
  id: string;
  tenantId: string;
  channel: Channel;
  provider: ChannelProvider;
  externalId: string;
  name: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export const ConnectedAccountDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  channel: ChannelSchema,
  provider: ChannelProviderSchema,
  externalId: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export interface ProviderSecretsDto {
  waPhoneNumberId?: string;
  waAccessToken?: string;
  waAppId?: string;
  waAppSecret?: string;
  metaAppSecret?: string;
  instagramAppSecret?: string;
  webhookVerifyToken?: string;
  pageAccessToken?: string;
  telegramBotToken?: string;
  telegramChannelId?: string;
  discordBotToken?: string;
  discordChannelId?: string;
  discordPublicKey?: string;
  slackBotToken?: string;
  slackSigningSecret?: string;
  graphVersion?: string;
}

export const ProviderSecretsSchema = z
  .object({
    waPhoneNumberId: z.string().max(64).optional(),
    waAccessToken: z.string().max(4096).optional(),
    waAppId: z.string().max(64).optional(),
    waAppSecret: z.string().max(512).optional(),
    metaAppSecret: z.string().max(512).optional(),
    instagramAppSecret: z.string().max(512).optional(),
    webhookVerifyToken: z.string().max(256).optional(),
    pageAccessToken: z.string().max(4096).optional(),
    telegramBotToken: z.string().max(512).optional(),
    telegramChannelId: z.string().max(64).optional(),
    discordBotToken: z.string().max(512).optional(),
    discordChannelId: z.string().max(64).optional(),
    discordPublicKey: z.string().max(128).optional(),
    slackBotToken: z.string().max(512).optional(),
    slackSigningSecret: z.string().max(512).optional(),
    graphVersion: z.string().max(16).optional(),
  })
  .strict();

export type ConnectionFlag =
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "telegram"
  | "discord"
  | "slack"
  | "widget";

export interface SettingsPayloadDto {
  settings: {
    accounts: ConnectedAccountDto[];
    connected: Record<ConnectionFlag, boolean>;
    pageId: string | null;
    pageName: string | null;
    instagramUsername: string | null;
    telegramBotId: string | null;
    discordBotId: string | null;
    slackBotId?: string | null;
    updatedAt: string | null;
    webhookVerifyToken: string;
    waPhoneNumberId?: string | null;
    waAppId?: string | null;
  };
  oauth: {
    metaConfigured: boolean;
  };
  webhookUrls: {
    meta: string;
    telegram: string | null;
    discord: string | null;
    slack?: string | null;
  };
}
