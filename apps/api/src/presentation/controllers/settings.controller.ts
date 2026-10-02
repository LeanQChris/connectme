import { Controller, Get, Post, Query, Body, Headers, Inject } from "@nestjs/common";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { AesVaultService } from "@connectme/channels";
import {
  SettingsPayloadDto,
  ProviderSecretsDto,
  ConnectedAccountDto,
  Channel,
} from "@connectme/contracts";

@Controller("api/settings")
export class SettingsController {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly aesVault: AesVaultService,
  ) {}

  private async resolveTenantId(headerTenantId?: string): Promise<string> {
    if (headerTenantId) return headerTenantId;
    const defaultTenant = await this.tenantRepo.getOrCreateDefaultTenant("system", "admin@connectme.local");
    return defaultTenant.id;
  }

  @Get()
  async getSettings(@Headers("x-tenant-id") headerTenantId: string): Promise<SettingsPayloadDto> {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const creds = await this.tenantRepo.getCredentials(tenantId);
    const accounts = await this.tenantRepo.findConnectedAccounts(tenantId);

    const connected = {
      whatsapp: Boolean(creds?.waPhoneNumberId && creds?.waAccessTokenEnc),
      messenger: Boolean(creds?.pageAccessTokenEnc || accounts.some((a) => a.channel === "MESSENGER")),
      instagram: Boolean(accounts.some((a) => a.channel === "INSTAGRAM")),
      telegram: Boolean(creds?.telegramTokenEnc || accounts.some((a) => a.channel === "TELEGRAM")),
      discord: Boolean(creds?.discordBotTokenEnc || accounts.some((a) => a.channel === "DISCORD")),
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const mappedAccounts: ConnectedAccountDto[] = accounts.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      channel: a.channel.toLowerCase() as Channel,
      provider: a.provider as any,
      externalId: a.externalId,
      name: a.name,
      avatarUrl: a.avatarUrl,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      settings: {
        accounts: mappedAccounts,
        connected,
        pageId: accounts.find((a) => a.channel === "MESSENGER")?.externalId ?? null,
        pageName: accounts.find((a) => a.channel === "MESSENGER")?.name ?? null,
        instagramUsername: accounts.find((a) => a.channel === "INSTAGRAM")?.name ?? null,
        telegramBotId: accounts.find((a) => a.channel === "TELEGRAM")?.externalId ?? null,
        discordBotId: accounts.find((a) => a.channel === "DISCORD")?.externalId ?? null,
        updatedAt: creds?.updatedAt ? creds.updatedAt.toISOString() : null,
        webhookVerifyToken: creds?.webhookVerifyToken || "connectme_verify_token",
        waPhoneNumberId: creds?.waPhoneNumberId ?? null,
        waAppId: creds?.waAppId ?? null,
      },
      oauth: {
        metaConfigured: Boolean(process.env.META_CLIENT_ID && process.env.META_CLIENT_SECRET),
      },
      webhookUrls: {
        meta: `${baseUrl}/api/webhook/meta`,
        telegram: `${baseUrl}/api/webhook/telegram`,
        discord: `${baseUrl}/api/webhook/discord`,
      },
    };
  }

  @Post()
  async saveSettings(
    @Headers("x-tenant-id") headerTenantId: string,
    @Body() body: { secrets: ProviderSecretsDto },
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const s = body.secrets || {};

    const partial: any = {};
    if (s.waPhoneNumberId !== undefined) partial.waPhoneNumberId = s.waPhoneNumberId;
    if (s.waAppId !== undefined) partial.waAppId = s.waAppId;
    if (s.webhookVerifyToken !== undefined) partial.webhookVerifyToken = s.webhookVerifyToken;
    if (s.discordPublicKey !== undefined) partial.discordPublicKey = s.discordPublicKey;

    if (s.waAccessToken) partial.waAccessTokenEnc = this.aesVault.encrypt(s.waAccessToken);
    if (s.metaAppSecret) partial.metaAppSecretEnc = this.aesVault.encrypt(s.metaAppSecret);
    if (s.pageAccessToken) partial.pageAccessTokenEnc = this.aesVault.encrypt(s.pageAccessToken);
    if (s.telegramBotToken) partial.telegramTokenEnc = this.aesVault.encrypt(s.telegramBotToken);
    if (s.discordBotToken) partial.discordBotTokenEnc = this.aesVault.encrypt(s.discordBotToken);

    await this.tenantRepo.updateCredentials(tenantId, partial);
    return { ok: true };
  }

  @Post("verify")
  async verifyConnection(
    @Headers("x-tenant-id") headerTenantId: string,
    @Body() body: { channel: string },
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const creds = await this.tenantRepo.getCredentials(tenantId);
    if (!creds) return { ok: false, detail: "No credentials saved." };

    const graphVersion = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";

    switch (body.channel) {
      case "whatsapp": {
        if (!creds.waPhoneNumberId || !creds.waAccessTokenEnc) {
          return { ok: false, detail: "Phone number id and access token are both required." };
        }
        const token = this.aesVault.decrypt<string>(creds.waAccessTokenEnc) || creds.waAccessTokenEnc;
        const url = `https://graph.facebook.com/${graphVersion}/${creds.waPhoneNumberId}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(url).catch(() => null);
        const data = await res?.json().catch(() => ({}));
        if (!res?.ok) return { ok: false, detail: data?.error?.message || "WhatsApp verification failed" };
        const label = data.verified_name || data.display_phone_number || creds.waPhoneNumberId;
        return { ok: true, detail: `Connected to ${label}` };
      }
      case "page": {
        if (!creds.pageAccessTokenEnc) {
          return { ok: false, detail: "Page access token is required." };
        }
        const token = this.aesVault.decrypt<string>(creds.pageAccessTokenEnc) || creds.pageAccessTokenEnc;
        const url = `https://graph.facebook.com/${graphVersion}/me?fields=id,name&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(url).catch(() => null);
        const data = await res?.json().catch(() => ({}));
        if (!res?.ok) return { ok: false, detail: data?.error?.message || "Facebook Page verification failed" };
        return { ok: true, detail: `Connected to ${data.name || "Facebook Page"}` };
      }
      case "telegram": {
        if (!creds.telegramTokenEnc) {
          return { ok: false, detail: "Telegram bot token is required." };
        }
        const token = this.aesVault.decrypt<string>(creds.telegramTokenEnc) || creds.telegramTokenEnc;
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`).catch(() => null);
        const data = await res?.json().catch(() => ({}));
        if (!res?.ok || !data.ok) return { ok: false, detail: data?.description || "Telegram bot verification failed" };
        return { ok: true, detail: `Connected to @${data.result?.username}` };
      }
      case "discord": {
        if (!creds.discordBotTokenEnc) {
          return { ok: false, detail: "Discord bot token is required." };
        }
        const token = this.aesVault.decrypt<string>(creds.discordBotTokenEnc) || creds.discordBotTokenEnc;
        const res = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bot ${token}` },
        }).catch(() => null);
        const data = await res?.json().catch(() => ({}));
        if (!res?.ok) return { ok: false, detail: data?.message || "Discord bot verification failed" };
        return { ok: true, detail: `Connected to ${data.username}#${data.discriminator || "0"}` };
      }
      default:
        return { ok: false, detail: "Unknown channel" };
    }
  }

  @Get("telegram/setup")
  async setupTelegram(
    @Headers("x-tenant-id") headerTenantId: string,
    @Query("url") domainUrl?: string,
  ) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const creds = await this.tenantRepo.getCredentials(tenantId);
    if (!creds?.telegramTokenEnc) return { error: "Telegram bot token not configured" };

    const token = this.aesVault.decrypt<string>(creds.telegramTokenEnc) || creds.telegramTokenEnc;
    const botId = token.split(":")[0];

    if (!domainUrl) {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).catch(() => null);
      return {
        status: "info",
        botId,
        webhook: await res?.json().catch(() => ({})),
      };
    }

    const webhookUrl = `${domainUrl.replace(/\/$/, "")}/api/webhook/telegram/${botId}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await res.json().catch(() => ({}));
    return { result: data, webhookUrl };
  }

  @Get("discord/setup")
  async setupDiscord(@Headers("x-tenant-id") headerTenantId: string) {
    const tenantId = await this.resolveTenantId(headerTenantId);
    const creds = await this.tenantRepo.getCredentials(tenantId);
    if (!creds?.discordBotTokenEnc) return { error: "Discord bot token not configured" };

    const token = this.aesVault.decrypt<string>(creds.discordBotTokenEnc) || creds.discordBotTokenEnc;
    const meRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
    });
    const me = await meRes.json().catch(() => ({}));
    if (!me?.id) return { error: "Failed to fetch Discord application id" };

    // Register /connectme slash command globally
    const cmdRes = await fetch(`https://discord.com/api/v10/applications/${me.id}/commands`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "connectme",
        description: "Send a message into ConnectMe unified inbox",
        options: [
          {
            name: "message",
            description: "Your message to the team",
            type: 3, // String
            required: true,
          },
        ],
      }),
    });

    const cmdData = await cmdRes.json().catch(() => ({}));
    return {
      status: cmdRes.ok ? "success" : "error",
      command: "/connectme",
      result: cmdData,
    };
  }
}
