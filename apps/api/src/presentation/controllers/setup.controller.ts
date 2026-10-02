import { Controller, Get, Query, Headers, Inject } from "@nestjs/common";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { AesVaultService } from "@connectme/channels";

@Controller("api")
export class SetupController {
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
            type: 3,
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
