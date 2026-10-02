/**
 * Tenant resolution.
 *
 * Identity comes from Clerk; provider credentials come from this tenant's own
 * encrypted record. Server-only: everything here touches the store or Clerk.
 */

import { auth, currentUser } from "@clerk/nextjs/server";

import { decryptSecrets, telegramBotId } from "./secrets";
import { getCredentials, upsertUser } from "./store";
import type {
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

function connectedFlags(secrets: ProviderSecrets): Record<ConnectionFlag, boolean> {
  return {
    whatsapp: Boolean(secrets.waPhoneNumberId && secrets.waAccessToken),
    messenger: Boolean(secrets.pageAccessToken),
    instagram: Boolean(secrets.pageAccessToken),
    telegram: Boolean(secrets.telegramBotToken),
    discord: Boolean(secrets.discordBotToken),
  };
}

/** Everything the settings UI needs, minus the secrets themselves. */
export async function tenantSettings(userId: string): Promise<TenantSettings> {
  const [record, secrets] = await Promise.all([getCredentials(userId), tenantSecrets(userId)]);
  return {
    secrets,
    connected: connectedFlags(secrets),
    pageId: record?.pageId ?? null,
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

  return {
    settings: {
      connected: settings.connected,
      pageId: settings.pageId,
      telegramBotId: settings.telegramBotId,
      discordBotId: settings.discordBotId,
      updatedAt: settings.updatedAt,
      webhookVerifyToken: settings.secrets.webhookVerifyToken,
    },
    webhookUrls: {
      meta: `${origin}/api/webhook`,
      telegram: botId ? `${origin}/api/webhook/telegram/${botId}` : null,
      discord: `${origin}/api/webhook/discord`,
    },
  };
}

/**
 * Finds the tenant behind a Meta webhook and verifies its signature.
 *
 * The ids inside the payload pick the candidate tenant; the HMAC check with that
 * tenant's app secret is what actually authenticates the request, so an attacker
 * cannot spoof a tenant by putting someone else's phone number id in the body.
 */
export async function authenticateMetaWebhook(
  rawBody: string,
  signature: string | null,
  ids: { waPhoneNumberId?: string; pageId?: string },
): Promise<CredentialRecord | null> {
  const { verifyWebhookSignature } = await import("./meta/verify");
  const { credentialsByRoutingId } = await import("./store");

  const candidates = await credentialsByRoutingId(ids);
  for (const candidate of candidates) {
    const secrets = await tenantSecrets(candidate.userId);
    if (!secrets.metaAppSecret) continue;
    if (verifyWebhookSignature(rawBody, signature, secrets.metaAppSecret)) return candidate;
  }
  return null;
}

/** The token a tenant must put in their Meta webhook verification field. */
export async function findTenantByVerifyToken(token: string): Promise<CredentialRecord | null> {
  if (!token) return null;
  const { listCredentials } = await import("./store");
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
