/**
 * Tenant resolution.
 *
 * Identity comes from Clerk; provider credentials come from this tenant's own
 * encrypted record. Server-only: everything here touches the store or Clerk.
 */

import { randomUUID } from "node:crypto";

import { auth, currentUser } from "@clerk/nextjs/server";

import { decryptSecrets, encryptSecrets, telegramBotId } from "./secrets";
import { getCredentials, getUserSettings, saveCredentials, upsertUser } from "./store";
import type {
  ConnectedAccount,
  ConnectionFlag,
  CredentialRecord,
  ProviderSecrets,
  SettingsPayload,
  TenantSettings,
} from "./types";

export const GRAPH_VERSION_FALLBACK = "v21.0";

/** The signed-in Clerk user, or null on public routes. */
export async function currentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Guard for route handlers: returns the tenant's userId, or the 401 response
 * to hand back. Proxy already redirects browsers, but a route must not trust it.
 */
export async function requireUserId(): Promise<{ userId: string } | Response> {
  const userId = await currentUserId();
  return userId ? { userId } : unauthorized();
}

function normalize(secrets: ProviderSecrets): ProviderSecrets {
  return {
    ...secrets,
    graphVersion: secrets.graphVersion?.trim() || GRAPH_VERSION_FALLBACK,
  };
}

/** Decrypted credentials for a tenant; empty strings when nothing is set up yet. */
export async function tenantSecrets(userId: string): Promise<ProviderSecrets> {
  const record = await getCredentials(userId);
  const decrypted = record ? decryptSecrets(record.encrypted) : null;
  return normalize(
    decrypted ?? {
      waPhoneNumberId: record?.waPhoneNumberId ?? "",
      waAccessToken: "",
      waAppId: "",
      waAppSecret: "",
      metaAppSecret: "",
      instagramAppSecret: "",
      webhookVerifyToken: "",
      pageAccessToken: "",
      telegramBotToken: "",
      discordBotToken: "",
      discordPublicKey: "",
      slackBotToken: "",
      slackSigningSecret: "",
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioPhoneNumber: "",
      viberAuthToken: "",
      emailApiKey: "",
      emailFrom: "",
      graphVersion: GRAPH_VERSION_FALLBACK,
    },
  );
}

function connectedFlags(
  secrets: ProviderSecrets,
  accounts: ConnectedAccount[] = [],
  record?: CredentialRecord | null,
): Record<ConnectionFlag, boolean> {
  return {
    whatsapp:
      Boolean(secrets.waPhoneNumberId && secrets.waAccessToken) ||
      accounts.some((a) => a.channel === "whatsapp"),
    messenger:
      Boolean(secrets.pageAccessToken) ||
      accounts.some((a) => a.channel === "messenger"),
    instagram:
      Boolean(secrets.pageAccessToken) ||
      accounts.some((a) => a.channel === "instagram"),
    telegram:
      Boolean(secrets.telegramBotToken) ||
      accounts.some((a) => a.channel === "telegram"),
    discord:
      Boolean(secrets.discordBotToken) ||
      accounts.some((a) => a.channel === "discord"),
    slack:
      Boolean(secrets.slackBotToken) ||
      accounts.some((a) => a.channel === "slack"),
    widget: Boolean(record?.widgetId),
    sms: Boolean(secrets.twilioAccountSid && secrets.twilioAuthToken && secrets.twilioPhoneNumber),
    viber: Boolean(secrets.viberAuthToken),
    email: Boolean(secrets.emailApiKey && secrets.emailFrom),
  };
}

/** Everything the settings UI needs, minus the secrets themselves. */
export async function tenantSettings(userId: string): Promise<TenantSettings> {
  const [record, secrets, userSettings] = await Promise.all([
    getCredentials(userId),
    tenantSecrets(userId),
    getUserSettings(userId),
  ]);
  const rawAccounts = record?.accounts ?? [];
  // Strip tokens before passing to UI
  const safeAccounts: ConnectedAccount[] = rawAccounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    channel: a.channel,
    name: a.name,
    externalId: a.externalId,
    avatarUrl: a.avatarUrl ?? null,
    connectedAt: a.connectedAt,
  }));

  return {
    secrets,
    accounts: safeAccounts,
    connected: connectedFlags(secrets, rawAccounts, record),
    pageId: record?.pageId ?? null,
    pageName: record?.pageName ?? null,
    instagramUsername: record?.instagramUsername ?? null,
    telegramBotId: record?.telegramBotId ?? null,
    discordBotId: record?.discordBotId ?? null,
    slackTeamId: record?.slackTeamId ?? null,
    slackBotId: record?.slackBotId ?? null,
    widgetId: record?.widgetId ?? null,
    widgetAllowedOrigins: record?.widgetAllowedOrigins ?? [],
    updatedAt: record?.updatedAt ?? null,
    webhookUrl: userSettings.webhookUrl,
    agents: userSettings.agents,
    templates: userSettings.templates,
  };
}

/**
 * The settings payload, minus every secret except the copyable verify token.
 *
 * Built on the server so `/settings` can render filled-in on first paint; the
 * API route returns the same shape to refresh it after a save.
 */
export async function settingsPayload(
  userId: string,
  origin: string,
): Promise<SettingsPayload> {
  const settings = await tenantSettings(userId);
  const botId = telegramBotId(settings.secrets.telegramBotToken);
  const { config } = await import("./config");

  return {
    settings: {
      accounts: settings.accounts,
      connected: settings.connected,
      pageId: settings.pageId,
      pageName: settings.pageName,
      instagramUsername: settings.instagramUsername,
      telegramBotId: settings.telegramBotId,
      discordBotId: settings.discordBotId,
      slackTeamId: settings.slackTeamId,
      slackBotId: settings.slackBotId,
      widgetId: settings.widgetId,
      widgetAllowedOrigins: settings.widgetAllowedOrigins,
      widgetScriptUrl: settings.widgetId
        ? `${origin}/widget.js?wid=${encodeURIComponent(settings.widgetId)}`
        : null,
      updatedAt: settings.updatedAt,
      webhookVerifyToken: settings.secrets.webhookVerifyToken,
      waPhoneNumberId: settings.secrets.waPhoneNumberId || null,
      waAppId: settings.secrets.waAppId || null,
      webhookUrl: settings.webhookUrl,
      agents: settings.agents,
      templates: settings.templates,
      aiConfigured: Boolean(settings.secrets.aiApiKey),
      aiProvider: settings.secrets.aiProvider,
      aiModel: settings.secrets.aiModel,
    },
    oauth: {
      metaConfigured: Boolean(config.metaAppId),
    },
    webhookUrls: {
      meta: `${origin}/api/webhook`,
      telegram: botId ? `${origin}/api/webhook/telegram/${botId}` : null,
      discord: `${origin}/api/webhook/discord`,
      slack: `${origin}/api/webhook/slack`,
      sms: settings.secrets.twilioPhoneNumber
        ? `${origin}/api/webhook/sms/${encodeURIComponent(settings.secrets.twilioPhoneNumber)}`
        : null,
      viber: settings.secrets.viberAuthToken
        ? `${origin}/api/webhook/viber/${settings.secrets.viberAuthToken.slice(0, 12)}`
        : null,
      email: settings.secrets.emailFrom
        ? `${origin}/api/webhook/email/${encodeURIComponent(settings.secrets.emailFrom)}`
        : null,
    },
  };
}

/** Resolves the specific access token for a connected account or fallback. */
export async function getAccountAccessToken(
  userId: string,
  externalIdOrAccountId: string | null | undefined,
): Promise<string | null> {
  const record = await getCredentials(userId);
  if (externalIdOrAccountId && record?.accounts) {
    const matched = record.accounts.find(
      (a) => a.id === externalIdOrAccountId || a.externalId === externalIdOrAccountId,
    );
    if (matched?.token) return matched.token;
  }
  const secrets = await tenantSecrets(userId);
  return secrets.pageAccessToken || null;
}

/** Adds or updates connected accounts for a tenant. */
export async function addOrUpdateConnectedAccounts(
  userId: string,
  newAccounts: ConnectedAccount[],
): Promise<void> {
  const record = await getCredentials(userId);
  const currentAccounts = record?.accounts ?? [];
  const merged = [...currentAccounts];

  for (const account of newAccounts) {
    const idx = merged.findIndex((a) => a.externalId === account.externalId && a.channel === account.channel);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...account };
    } else {
      merged.push(account);
    }
  }

  const secrets = await tenantSecrets(userId);
  await saveCredentials({
    userId,
    encrypted: encryptSecrets(secrets),
    accounts: merged,
    waPhoneNumberId: record?.waPhoneNumberId || secrets.waPhoneNumberId || undefined,
    pageId: merged.find((a) => a.channel === "messenger")?.externalId ?? record?.pageId,
    pageName: merged.find((a) => a.channel === "messenger")?.name ?? record?.pageName,
    instagramUsername: merged.find((a) => a.channel === "instagram")?.name ?? record?.instagramUsername,
    telegramBotId: record?.telegramBotId,
    discordBotId: record?.discordBotId,
    updatedAt: new Date().toISOString(),
  });
}

/** Removes a specific connected account from a tenant. */
export async function removeConnectedAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  const record = await getCredentials(userId);
  if (!record?.accounts) return;

  const filtered = record.accounts.filter((a) => a.id !== accountId && a.externalId !== accountId);
  const secrets = await tenantSecrets(userId);

  await saveCredentials({
    userId,
    encrypted: encryptSecrets(secrets),
    accounts: filtered,
    waPhoneNumberId: record.waPhoneNumberId,
    pageId: filtered.find((a) => a.channel === "messenger")?.externalId,
    pageName: filtered.find((a) => a.channel === "messenger")?.name,
    instagramUsername: filtered.find((a) => a.channel === "instagram")?.name,
    telegramBotId: record.telegramBotId,
    discordBotId: record.discordBotId,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Automatically inspects saved provider credentials and discovers/synchronizes
 * connected Facebook pages, Instagram handles, WhatsApp phone details, Telegram, and Discord bots.
 */
export async function syncProviderMetadata(userId: string): Promise<ConnectedAccount[]> {
  const secrets = await tenantSecrets(userId);
  const graphVersion = secrets.graphVersion || GRAPH_VERSION_FALLBACK;
  const now = new Date().toISOString();
  const discovered: ConnectedAccount[] = [];

  // 1. Meta Pages & Instagram (from pageAccessToken or user/system token)
  if (secrets.pageAccessToken) {
    try {
      // First try /me/accounts in case it's a User Access Token or System User Token
      const accountsRes = await fetch(
        `https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(secrets.pageAccessToken)}`,
        { cache: "no-store" }
      );
      const accountsData = await accountsRes.json().catch(() => null);

      if (accountsRes.ok && Array.isArray(accountsData?.data) && accountsData.data.length > 0) {
        for (const page of accountsData.data) {
          discovered.push({
            id: `meta_page_${page.id}`,
            provider: "meta",
            channel: "messenger",
            name: page.name || `Page ${page.id}`,
            externalId: page.id,
            token: page.access_token || secrets.pageAccessToken,
            connectedAt: now,
          });

          if (page.instagram_business_account?.id) {
            const igId = page.instagram_business_account.id;
            const igName = page.instagram_business_account.username || `${page.name} (Instagram)`;
            discovered.push({
              id: `meta_ig_${igId}`,
              provider: "meta",
              channel: "instagram",
              name: igName.startsWith("@") ? igName : `@${igName}`,
              externalId: igId,
              token: page.access_token || secrets.pageAccessToken,
              connectedAt: now,
            });
          }
        }
      } else {
        // Otherwise it's a single Page Token, query /me directly
        const pageRes = await fetch(
          `https://graph.facebook.com/${graphVersion}/me?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(secrets.pageAccessToken)}`,
          { cache: "no-store" }
        );
        const pageData = await pageRes.json().catch(() => null);

        if (pageRes.ok && pageData?.id) {
          discovered.push({
            id: `meta_page_${pageData.id}`,
            provider: "meta",
            channel: "messenger",
            name: pageData.name || `Page ${pageData.id}`,
            externalId: pageData.id,
            token: secrets.pageAccessToken,
            connectedAt: now,
          });

          if (pageData.instagram_business_account?.id) {
            const igId = pageData.instagram_business_account.id;
            const igName = pageData.instagram_business_account.username || `${pageData.name} (Instagram)`;
            discovered.push({
              id: `meta_ig_${igId}`,
              provider: "meta",
              channel: "instagram",
              name: igName.startsWith("@") ? igName : `@${igName}`,
              externalId: igId,
              token: secrets.pageAccessToken,
              connectedAt: now,
            });
          }
        }
      }
    } catch (err) {
      console.warn("[sync] Meta discovery failed:", err);
    }
  }

  // 2. WhatsApp
  if (secrets.waPhoneNumberId && secrets.waAccessToken) {
    try {
      const waRes = await fetch(
        `https://graph.facebook.com/${graphVersion}/${secrets.waPhoneNumberId}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(secrets.waAccessToken)}`,
        { cache: "no-store" }
      );
      const waData = await waRes.json().catch(() => null);
      if (waRes.ok && waData) {
        const label = waData.verified_name || waData.display_phone_number || secrets.waPhoneNumberId;
        discovered.push({
          id: `wa_${secrets.waPhoneNumberId}`,
          provider: "whatsapp",
          channel: "whatsapp",
          name: label,
          externalId: secrets.waPhoneNumberId,
          token: secrets.waAccessToken,
          connectedAt: now,
        });
      }
    } catch (err) {
      console.warn("[sync] WhatsApp discovery failed:", err);
    }
  }

  // 3. Telegram
  if (secrets.telegramBotToken) {
    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${secrets.telegramBotToken}/getMe`,
        { cache: "no-store" }
      );
      const tgData = await tgRes.json().catch(() => null);
      if (tgRes.ok && tgData?.ok && tgData.result) {
        const botName = tgData.result.username ? `@${tgData.result.username}` : tgData.result.first_name || "Telegram Bot";
        const botId = String(tgData.result.id);
        discovered.push({
          id: `tg_${botId}`,
          provider: "telegram",
          channel: "telegram",
          name: botName,
          externalId: botId,
          token: secrets.telegramBotToken,
          connectedAt: now,
        });
      }
    } catch (err) {
      console.warn("[sync] Telegram discovery failed:", err);
    }
  }

  // 4. Discord
  if (secrets.discordBotToken) {
    try {
      const discordRes = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bot ${secrets.discordBotToken.trim()}` },
        cache: "no-store",
      });
      const discordData = await discordRes.json().catch(() => null);
      if (discordRes.ok && discordData?.id) {
        const botName = `@${discordData.username}${discordData.global_name ? ` (${discordData.global_name})` : ""}`;
        discovered.push({
          id: `discord_${discordData.id}`,
          provider: "discord",
          channel: "discord",
          name: botName,
          externalId: discordData.id,
          token: secrets.discordBotToken,
          connectedAt: now,
        });
      }
    } catch (err) {
      console.warn("[sync] Discord discovery failed:", err);
    }
  }

  // 5. Slack
  if (secrets.slackBotToken) {
    try {
      const slackRes = await fetch("https://slack.com/api/auth.test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secrets.slackBotToken.trim()}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        cache: "no-store",
      });
      const slackData = await slackRes.json().catch(() => null);
      if (slackRes.ok && slackData?.ok && slackData.team_id) {
        const teamLabel = slackData.team ? `${slackData.team} (${slackData.user})` : `Slack Workspace ${slackData.team_id}`;
        discovered.push({
          id: `slack_${slackData.team_id}`,
          provider: "slack",
          channel: "slack",
          name: teamLabel,
          externalId: slackData.team_id,
          token: secrets.slackBotToken,
          connectedAt: now,
        });
      }
    } catch (err) {
      console.warn("[sync] Slack discovery failed:", err);
    }
  }

  // 6. Twilio SMS
  if (secrets.twilioAccountSid && secrets.twilioAuthToken && secrets.twilioPhoneNumber) {
    discovered.push({
      id: `twilio_${secrets.twilioPhoneNumber}`,
      provider: "sms",
      channel: "sms",
      name: secrets.twilioPhoneNumber,
      externalId: secrets.twilioPhoneNumber,
      token: secrets.twilioAuthToken,
      connectedAt: now,
    });
  }

  // 7. Viber
  if (secrets.viberAuthToken) {
    try {
      const viberRes = await fetch("https://chatapi.viber.com/pa/get_account_info", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Viber-Auth-Token": secrets.viberAuthToken.trim(),
        },
        body: "{}",
        cache: "no-store",
      });
      const viberData = await viberRes.json().catch(() => null);
      if (viberRes.ok && viberData?.status === 0 && viberData?.id) {
        discovered.push({
          id: `viber_${viberData.id}`,
          provider: "viber",
          channel: "viber",
          name: viberData.name ?? "Viber Bot",
          externalId: secrets.viberAuthToken.slice(0, 12),
          token: secrets.viberAuthToken,
          connectedAt: now,
        });
      }
    } catch (err) {
      console.warn("[sync] Viber discovery failed:", err);
    }
  }

  // 8. Email
  if (secrets.emailApiKey && secrets.emailFrom) {
    discovered.push({
      id: `email_${secrets.emailFrom}`,
      provider: "email",
      channel: "email",
      name: secrets.emailFrom,
      externalId: secrets.emailFrom,
      token: secrets.emailApiKey,
      connectedAt: now,
    });
  }

  if (discovered.length > 0) {
    await addOrUpdateConnectedAccounts(userId, discovered);
  }

  return discovered;
}

/**
 * Finds the tenant behind a Meta webhook and verifies its signature.
 *
 * The ids inside the payload pick the candidate tenant; the HMAC check with that
 * tenant's app secret or the platform's central app secret authenticates the request.
 */
export async function authenticateMetaWebhook(
  rawBody: string,
  signature: string | null,
  ids: { waPhoneNumberId?: string; pageId?: string },
): Promise<CredentialRecord | null> {
  const { verifyWebhookSignature } = await import("./meta/verify");
  const { credentialsByRoutingId, listCredentials } = await import("./store");
  const { config } = await import("./config");

  // 1. Try candidates matched by routing IDs
  let candidates = await credentialsByRoutingId(ids);

  // 2. If no candidate matched by exact ID, fallback to testing all saved credentials with HMAC
  if (candidates.length === 0) {
    candidates = await listCredentials();
  }

  if (candidates.length === 0) {
    console.warn(
      `[webhook] rejected: no tenant credentials found in store. Webhook received with ids:`,
      ids,
    );
    return null;
  }

  for (const candidate of candidates) {
    const secrets = await tenantSecrets(candidate.userId);
    // Check candidate's tenant-specific secret (WhatsApp app secret, Meta app secret, or .env META_APP_SECRET)
    const secretsToCheck = [
      secrets.waAppSecret,
      secrets.metaAppSecret,
      secrets.instagramAppSecret,
      config.metaAppSecret,
      config.instagramAppSecret,
    ].filter(Boolean) as string[];

    if (secretsToCheck.length === 0) {
      console.warn(
        `[webhook] tenant ${candidate.userId} has no App Secret configured (waAppSecret, metaAppSecret, or META_APP_SECRET in .env). Signature check cannot pass.`,
      );
      continue;
    }

    for (const secret of secretsToCheck) {
      if (verifyWebhookSignature(rawBody, signature, secret)) {
        return candidate;
      }
    }
  }

  console.warn(
    `[webhook] signature mismatch: incoming x-hub-signature-256 did not match secret for candidate tenants:`,
    candidates.map((c) => ({ userId: c.userId, waPhoneNumberId: c.waPhoneNumberId })),
  );
  return null;
}

/** The token a tenant must put in their Meta webhook verification field. */
export async function findTenantByVerifyToken(token: string): Promise<CredentialRecord | null> {
  if (!token) return null;
  const { listCredentials } = await import("./store");
  const { config } = await import("./config");

  // Check platform-level webhook verify token
  if (config.metaWebhookVerifyToken && config.metaWebhookVerifyToken === token) {
    const all = await listCredentials();
    return all[0] ?? { userId: "platform", encrypted: "", updatedAt: new Date().toISOString() };
  }

  for (const record of await listCredentials()) {
    const secrets = await tenantSecrets(record.userId);
    if (secrets.webhookVerifyToken && secrets.webhookVerifyToken === token) return record;
  }
  return null;
}

export async function tenantByTelegramBotId(botId: string): Promise<CredentialRecord | null> {
  const { credentialsByRoutingId } = await import("./store");
  const [record] = await credentialsByRoutingId({ telegramBotId: botId });
  return record ?? null;
}

/** The tenant behind a website widget embed id. */
export async function tenantByTwilioPhoneNumber(phoneNumber: string): Promise<CredentialRecord | null> {
  const { credentialsByRoutingId } = await import("./store");
  const [record] = await credentialsByRoutingId({ twilioPhoneNumber: phoneNumber });
  return record ?? null;
}

export async function tenantByViberTokenPrefix(prefix: string): Promise<CredentialRecord | null> {
  const { credentialsByRoutingId } = await import("./store");
  const [record] = await credentialsByRoutingId({ viberTokenPrefix: prefix });
  return record ?? null;
}

export async function tenantByEmailAddress(address: string): Promise<CredentialRecord | null> {
  const { credentialsByRoutingId } = await import("./store");
  const [record] = await credentialsByRoutingId({ emailAddress: address });
  return record ?? null;
}

export async function tenantByWidgetId(widgetId: string): Promise<CredentialRecord | null> {
  if (!widgetId) return null;
  const { credentialsByRoutingId } = await import("./store");
  const [record] = await credentialsByRoutingId({ widgetId });
  return record ?? null;
}

/**
 * Creates this tenant's widget embed id, or hands back the existing one.
 * `rotate` retires the current id so previously pasted script tags stop working.
 *
 * The id is public by design — it is in the script tag on the customer's website
 * — so it only routes traffic, it grants nothing on its own.
 */
export async function ensureWidgetId(userId: string, rotate = false): Promise<string> {
  const record = await getCredentials(userId);
  if (record?.widgetId && !rotate) return record.widgetId;

  const widgetId = `wgt_${randomUUID().replace(/-/g, "")}`;
  await saveCredentials({
    userId,
    encrypted: record?.encrypted ?? encryptSecrets(await tenantSecrets(userId)),
    accounts: record?.accounts,
    pageId: record?.pageId,
    pageName: record?.pageName,
    instagramUsername: record?.instagramUsername,
    waPhoneNumberId: record?.waPhoneNumberId,
    telegramBotId: record?.telegramBotId,
    discordBotId: record?.discordBotId,
    slackTeamId: record?.slackTeamId,
    slackBotId: record?.slackBotId,
    widgetId,
    updatedAt: new Date().toISOString(),
  });
  return widgetId;
}

/** Mirrors the Clerk profile locally on first authenticated request. */
export async function ensureTenantUser(): Promise<{ userId: string; email: string; name: string | null } | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    null;
  await upsertUser({ userId, email, name });
  return { userId, email, name };
}
