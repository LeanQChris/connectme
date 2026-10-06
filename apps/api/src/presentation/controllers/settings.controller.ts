import { Controller, Get, Post, Query, Body, Inject } from "@nestjs/common";
import { ITenantRepository } from "../../domain/repositories/i-tenant.repository";
import { AesVaultService } from "@connectme/channels";
import { ChannelType } from "@connectme/database";
import {
  SettingsPayloadDto,
  ProviderSecretsDto,
  ConnectedAccountDto,
  Channel,
} from "@connectme/contracts";
import { TenantId } from "../auth/tenant-id.decorator";
import { decryptStrict } from "../../infrastructure/crypto/decrypt-strict";
import { ensureWebhookVerifyToken } from "../webhook-verify-token";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { SaveSettingsBodySchema, ChannelSchema } from "../validation/schemas";

@Controller("api/settings")
export class SettingsController {
  constructor(
    @Inject("ITenantRepository")
    private readonly tenantRepo: ITenantRepository,
    private readonly aesVault: AesVaultService,
  ) {}

  @Get()
  async getSettings(@TenantId() tenantId: string): Promise<SettingsPayloadDto> {
    const creds = await this.tenantRepo.getCredentials(tenantId);
    const accounts = await this.tenantRepo.findConnectedAccounts(tenantId);

    const connected = {
      whatsapp: Boolean(creds?.waPhoneNumberId && creds?.waAccessTokenEnc),
      messenger: Boolean(creds?.pageAccessTokenEnc || accounts.some((a) => a.channel === "MESSENGER")),
      instagram: Boolean(accounts.some((a) => a.channel === "INSTAGRAM")),
      telegram: Boolean(creds?.telegramTokenEnc || accounts.some((a) => a.channel === "TELEGRAM")),
      discord: Boolean(creds?.discordBotTokenEnc || accounts.some((a) => a.channel === "DISCORD")),
      slack: Boolean(creds?.slackBotTokenEnc || accounts.some((a) => a.channel === "SLACK")),
      widget: true,
      ai: Boolean(creds?.aiApiKeyEnc),
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

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
        telegramBotId:
          accounts.find((a) => a.channel === "TELEGRAM" && a.provider === "telegram")
            ?.externalId ?? null,
        discordBotId:
          accounts.find((a) => a.channel === "DISCORD" && a.provider === "discord")?.externalId ??
          null,
        slackBotId:
          accounts.find((a) => a.channel === "SLACK" && a.provider === "slack")?.externalId ??
          null,
        updatedAt: creds?.updatedAt ? creds.updatedAt.toISOString() : null,
        // Minted here on first read so the UI always shows the real value.
        webhookVerifyToken: await ensureWebhookVerifyToken(
          this.tenantRepo,
          tenantId,
          creds?.webhookVerifyToken,
        ),
        waPhoneNumberId: creds?.waPhoneNumberId ?? null,
        waAppId: creds?.waAppId ?? null,
        ai: {
          configured: Boolean(creds?.aiApiKeyEnc),
          provider: creds?.aiProvider ?? "openai",
          model: creds?.aiModel ?? "gpt-4o-mini",
          customBaseUrl: creds?.aiCustomBaseUrl ?? null,
          customSystemPrompt: creds?.aiCustomSystemPrompt ?? null,
          fallbackConfigured: Boolean(creds?.aiFallbackApiKeyEnc),
          fallbackProvider: creds?.aiFallbackProvider ?? null,
          fallbackModel: creds?.aiFallbackModel ?? null,
          routingStrategy: creds?.aiRoutingStrategy ?? "priority",
        },
      },
      oauth: {
        metaConfigured: Boolean(process.env.META_CLIENT_ID && process.env.META_CLIENT_SECRET),
      },
      webhookUrls: {
        meta: `${baseUrl}/api/webhook/meta`,
        telegram: `${baseUrl}/api/webhook/telegram`,
        discord: `${baseUrl}/api/webhook/discord`,
        slack: `${baseUrl}/api/webhook/slack`,
      },
    };
  }

  @Post()
  async saveSettings(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(SaveSettingsBodySchema)) body: { secrets: ProviderSecretsDto },
  ) {
    const s = body.secrets || {};

    const partial: any = {};
    if (s.waPhoneNumberId !== undefined) partial.waPhoneNumberId = s.waPhoneNumberId;
    if (s.waAppId !== undefined) partial.waAppId = s.waAppId;
    // Blank means "leave unchanged" in the settings form. Writing an empty
    // value would clear the minted token and silently reject every inbound
    // Telegram update, because the webhook handler treats unset as invalid.
    if (s.webhookVerifyToken) partial.webhookVerifyToken = s.webhookVerifyToken;
    if (s.discordPublicKey !== undefined) partial.discordPublicKey = s.discordPublicKey;
    if (s.aiProvider !== undefined) partial.aiProvider = s.aiProvider;
    if (s.aiModel !== undefined) partial.aiModel = s.aiModel;
    if (s.aiCustomBaseUrl !== undefined) partial.aiCustomBaseUrl = s.aiCustomBaseUrl;
    if (s.aiCustomSystemPrompt !== undefined) partial.aiCustomSystemPrompt = s.aiCustomSystemPrompt;
    if (s.aiFallbackProvider !== undefined) partial.aiFallbackProvider = s.aiFallbackProvider;
    if (s.aiFallbackModel !== undefined) partial.aiFallbackModel = s.aiFallbackModel;
    if (s.aiRoutingStrategy !== undefined) partial.aiRoutingStrategy = s.aiRoutingStrategy;

    if (s.waAccessToken) partial.waAccessTokenEnc = this.aesVault.encrypt(s.waAccessToken);
    if (s.metaAppSecret) partial.metaAppSecretEnc = this.aesVault.encrypt(s.metaAppSecret);
    if (s.instagramAppSecret) partial.instagramAppSecretEnc = this.aesVault.encrypt(s.instagramAppSecret);
    if (s.pageAccessToken) partial.pageAccessTokenEnc = this.aesVault.encrypt(s.pageAccessToken);
    if (s.telegramBotToken) partial.telegramTokenEnc = this.aesVault.encrypt(s.telegramBotToken);
    if (s.discordBotToken) partial.discordBotTokenEnc = this.aesVault.encrypt(s.discordBotToken);
    if (s.slackBotToken) partial.slackBotTokenEnc = this.aesVault.encrypt(s.slackBotToken);
    if (s.slackSigningSecret) partial.slackSigningSecretEnc = this.aesVault.encrypt(s.slackSigningSecret);
    if (s.aiApiKey) partial.aiApiKeyEnc = this.aesVault.encrypt(s.aiApiKey);
    if (s.aiFallbackApiKey) partial.aiFallbackApiKeyEnc = this.aesVault.encrypt(s.aiFallbackApiKey);

    const updated = await this.tenantRepo.updateCredentials(tenantId, partial);

    // Register inbound-routing accounts so webhooks can resolve the tenant.
    if (updated.waPhoneNumberId) {
      await this.upsertAccount(tenantId, ChannelType.WHATSAPP, "meta", updated.waPhoneNumberId, "WhatsApp");
    }
    if (updated.telegramTokenEnc) {
      const token = decryptStrict(this.aesVault, updated.telegramTokenEnc);
      const botId = token.split(":")[0];
      if (botId) await this.upsertAccount(tenantId, ChannelType.TELEGRAM, "telegram", botId, `Telegram bot ${botId}`);
    }
    if (s.telegramChannelId) {
      await this.upsertAccount(
        tenantId,
        ChannelType.TELEGRAM,
        "telegram-channel",
        s.telegramChannelId,
        `Telegram channel ${s.telegramChannelId}`,
      );
    }
    if (s.discordChannelId) {
      await this.upsertAccount(
        tenantId,
        ChannelType.DISCORD,
        "discord-channel",
        s.discordChannelId,
        `Discord channel ${s.discordChannelId}`,
      );
    }
    // Register the Slack workspace so inbound events can be routed to this
    // tenant. Best-effort: the token is already saved, so a Slack outage must
    // not fail the whole settings request.
    if (s.slackBotToken) {
      try {
        const token = decryptStrict(this.aesVault, updated.slackBotTokenEnc!);
        const team = await this.slackWorkspace(token);
        if (team?.id) {
          await this.upsertAccount(tenantId, ChannelType.SLACK, "slack", team.id, team.name || `Slack ${team.id}`);
        }
      } catch {
        // Token is saved regardless; workspace routing stays unconfigured.
      }
    }

    return { ok: true };
  }

  /** Resolve the Slack workspace a bot token belongs to (auth.test). */
  private async slackWorkspace(
    token: string,
  ): Promise<{ id: string; name?: string } | null> {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.team?.id) return null;
    return { id: String(data.team.id), name: data.team.name };
  }

  private async upsertAccount(
    tenantId: string,
    channel: ChannelType,
    provider: string,
    externalId: string,
    name: string,
  ): Promise<void> {
    const existing = await this.tenantRepo.findAccountByExternalId(channel, externalId, provider);
    if (existing) {
      // Never mutate an account owned by another tenant: external ids are a
      // global routing key, so a second tenant must not hijack it.
      if (existing.tenantId !== tenantId) return;
      if (!existing.isActive || existing.name !== name) {
        await this.tenantRepo.saveConnectedAccount({ tenantId, id: existing.id, isActive: true, name });
      }
      return;
    }
    await this.tenantRepo.saveConnectedAccount({
      tenantId,
      channel: channel as any,
      provider,
      externalId,
      name,
      isActive: true,
    });
  }

  @Post("verify")
  async verifyConnection(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(ChannelSchema)) body: { channel: string },
  ) {
    const creds = await this.tenantRepo.getCredentials(tenantId);
    if (!creds) return { ok: false, detail: "No credentials saved." };

    const graphVersion = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v22.0";

    switch (body.channel) {
      case "whatsapp": {
        if (!creds.waPhoneNumberId || !creds.waAccessTokenEnc) {
          return { ok: false, detail: "Phone number id and access token are both required." };
        }
        const token = decryptStrict(this.aesVault, creds.waAccessTokenEnc);
        const url = `https://graph.facebook.com/${graphVersion}/${creds.waPhoneNumberId}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(token)}`;
        const result = await this.probe(url);
        if (!result.ok) return { ok: false, detail: result.detail };
        const data = result.data;
        const label = data.verified_name || data.display_phone_number || creds.waPhoneNumberId;
        return { ok: true, detail: `Connected to ${label}` };
      }
      case "page": {
        if (!creds.pageAccessTokenEnc) {
          return { ok: false, detail: "Page access token is required." };
        }
        const token = decryptStrict(this.aesVault, creds.pageAccessTokenEnc);
        const url = `https://graph.facebook.com/${graphVersion}/me?fields=id,name&access_token=${encodeURIComponent(token)}`;
        const result = await this.probe(url);
        if (!result.ok) return { ok: false, detail: result.detail };
        return { ok: true, detail: `Connected to ${result.data.name || "Facebook Page"}` };
      }
      case "telegram": {
        if (!creds.telegramTokenEnc) {
          return { ok: false, detail: "Telegram bot token is required." };
        }
        const token = decryptStrict(this.aesVault, creds.telegramTokenEnc);
        const result = await this.probe(`https://api.telegram.org/bot${token}/getMe`);
        if (!result.ok) {
          return { ok: false, detail: result.detail };
        }
        if (!result.data.ok) {
          return { ok: false, detail: result.data.description || "Telegram bot verification failed" };
        }
        return { ok: true, detail: `Connected to @${result.data.result?.username}` };
      }
      case "discord": {
        if (!creds.discordBotTokenEnc) {
          return { ok: false, detail: "Discord bot token is required." };
        }
        const token = decryptStrict(this.aesVault, creds.discordBotTokenEnc);
        const result = await this.probe("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bot ${token}` },
        });
        if (!result.ok) {
          return { ok: false, detail: result.detail || result.data?.message || "Discord bot verification failed" };
        }
        return { ok: true, detail: `Connected to ${result.data.username}#${result.data.discriminator || "0"}` };
      }
      case "slack": {
        if (!creds.slackBotTokenEnc) {
          return { ok: false, detail: "Slack bot token is required." };
        }
        const token = decryptStrict(this.aesVault, creds.slackBotTokenEnc);
        const result = await this.probe("https://slack.com/api/auth.test", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: "{}",
        });
        // Slack answers 200 with {"ok": false} for auth failures.
        if (!result.ok) {
          return { ok: false, detail: result.detail || "Slack bot verification failed" };
        }
        if (!result.data.ok) {
          return { ok: false, detail: result.data.error || "Slack bot verification failed" };
        }
        return { ok: true, detail: `Connected to ${result.data.team || "Slack workspace"}` };
      }
      default:
        return { ok: false, detail: "Unknown channel" };
    }
  }

  /**
   * Probe a provider endpoint and surface the real failure reason, whether it
   * is a network/timeout error or a provider error body, instead of collapsing
   * every failure to a generic message.
   */
  private async probe(
    url: string,
    init?: RequestInit,
  ): Promise<
    | { ok: true; status: number; data: any }
    | { ok: false; status: number; detail: string; data: any }
  > {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      const reason = (err as Error)?.name === "TimeoutError" ? "request timed out" : (err as Error)?.message;
      return { ok: false, status: 0, detail: `Could not reach provider: ${reason}`, data: {} };
    }
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        detail: data?.error?.message || data?.description || data?.message || `Provider returned HTTP ${res.status}`,
        data,
      };
    }
    return { ok: true, status: res.status, data };
  }

  @Get("telegram/setup")
  async setupTelegram(
    @TenantId() tenantId: string,
    @Query("url") domainUrl?: string,
  ) {
    const creds = await this.tenantRepo.getCredentials(tenantId);
    if (!creds?.telegramTokenEnc) return { error: "Telegram bot token not configured" };

    const token = decryptStrict(this.aesVault, creds.telegramTokenEnc);
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
    // Keep registered == shown == validated (see ensureWebhookVerifyToken).
    const secretToken = await ensureWebhookVerifyToken(this.tenantRepo, tenantId, creds.webhookVerifyToken);
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${encodeURIComponent(secretToken)}`,
    );
    const data = await res.json().catch(() => ({}));
    return { result: data, webhookUrl };
  }

  @Get("discord/setup")
  async setupDiscord(@TenantId() tenantId: string) {
    const creds = await this.tenantRepo.getCredentials(tenantId);
    if (!creds?.discordBotTokenEnc) return { error: "Discord bot token not configured" };

    const token = decryptStrict(this.aesVault, creds.discordBotTokenEnc);
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
