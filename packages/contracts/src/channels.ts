import { z } from "zod";

export const CHANNELS = ["whatsapp", "messenger", "instagram", "telegram", "discord"] as const;
export type Channel = (typeof CHANNELS)[number];
export const ChannelSchema = z.enum(CHANNELS);

export type ChannelProvider = "meta" | "telegram" | "discord";
export const ChannelProviderSchema = z.enum(["meta", "telegram", "discord"]);

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
  webhookVerifyToken?: string;
  pageAccessToken?: string;
  telegramBotToken?: string;
  discordBotToken?: string;
  discordPublicKey?: string;
  graphVersion?: string;
}

export type ConnectionFlag = "whatsapp" | "messenger" | "instagram" | "telegram" | "discord";

export interface SettingsPayloadDto {
  settings: {
    accounts: ConnectedAccountDto[];
    connected: Record<ConnectionFlag, boolean>;
    pageId: string | null;
    pageName: string | null;
    instagramUsername: string | null;
    telegramBotId: string | null;
    discordBotId: string | null;
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
  };
}
