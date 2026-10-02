/**
 * Tenant resolution.
 *
 * Identity comes from Clerk; provider credentials come from this tenant's own
 * encrypted record. Server-only: everything here touches the store or Clerk.
 */

import { auth, currentUser } from "@clerk/nextjs/server";

import { decryptSecrets, encryptSecrets, telegramBotId } from "./secrets";
import { getCredentials, saveCredentials, upsertUser } from "./store";
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
      webhookVerifyToken: "",
      pageAccessToken: "",
      telegramBotToken: "",
      discordBotToken: "",
      discordPublicKey: "",
      graphVersion: GRAPH_VERSION_FALLBACK,
    },
  );
}

function connectedFlags(
  secrets: ProviderSecrets,
  accounts: ConnectedAccount[] = [],
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
  };
}

/** Everything the settings UI needs, minus the secrets themselves. */
export async function tenantSettings(userId: string): Promise<TenantSettings> {
  const [record, secrets] = await Promise.all([getCredentials(userId), tenantSecrets(userId)]);
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
    connected: connectedFlags(secrets, rawAccounts),
    pageId: record?.pageId ?? null,
    pageName: record?.pageName ?? null,
    instagramUsername: record?.instagramUsername ?? null,
    telegramBotId: record?.telegramBotId ?? null,
    discordBotId: record?.discordBotId ?? null,
    updatedAt: record?.updatedAt ?? null,
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
      updatedAt: settings.updatedAt,
      webhookVerifyToken: settings.secrets.webhookVerifyToken,
      waPhoneNumberId: settings.secrets.waPhoneNumberId || null,
      waAppId: settings.secrets.waAppId || null,
    },
    oauth: {
      metaConfigured: Boolean(config.metaAppId),
    },
    webhookUrls: {
      meta: `${origin}/api/webhook`,
      telegram: botId ? `${origin}/api/webhook/telegram/${botId}` : null,
      discord: `${origin}/api/webhook/discord`,
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
    const secretsToCheck = [secrets.waAppSecret, secrets.metaAppSecret, config.metaAppSecret].filter(Boolean) as string[];

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
