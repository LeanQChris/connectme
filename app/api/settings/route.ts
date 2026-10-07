import { encryptSecrets, telegramBotId } from "@/lib/secrets";
import { getCredentials, saveCredentials, saveUserSettings } from "@/lib/store";
import { requireUserId, settingsPayload, syncProviderMetadata, tenantSecrets, tenantSettings } from "@/lib/tenant";

export const runtime = "nodejs";

const KEYS = [
  "waPhoneNumberId",
  "waAccessToken",
  "waAppId",
  "waAppSecret",
  "metaAppSecret",
  "instagramAppSecret",
  "webhookVerifyToken",
  "pageAccessToken",
  "telegramBotToken",
  "discordBotToken",
  "discordPublicKey",
  "slackBotToken",
  "slackSigningSecret",
  "twilioAccountSid",
  "twilioAuthToken",
  "twilioPhoneNumber",
  "viberAuthToken",
  "emailApiKey",
  "emailFrom",
  "graphVersion",
  "aiProvider",
  "aiApiKey",
  "aiModel",
] as const;

function pick(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const value = input[key];
    if (typeof value === "string") out[key] = value.trim();
  }
  return out;
}

/**
 * Settings read.
 *
 * Never returns secrets: only the webhook verify token (needed to paste into
 * Meta), presence flags, and the routing ids.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  return Response.json(
    await settingsPayload(auth.userId, new URL(request.url).origin),
  );
}

/**
 * Settings write. Secrets are merged over what is already stored, so a form can
 * submit only the fields the user actually filled in, then encrypted at rest.
 */
export async function PUT(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const current = await tenantSecrets(auth.userId);
  const patch = pick(payload);
  const secrets = { ...current, ...patch } as typeof current;

  const userSettingsPatch: { webhookUrl?: string | null; agents?: string[]; templates?: string[] } =
    {};
  if (payload.webhookUrl === null || typeof payload.webhookUrl === "string") {
    userSettingsPatch.webhookUrl =
      typeof payload.webhookUrl === "string" ? payload.webhookUrl.trim() || null : null;
  }
  if (
    Array.isArray(payload.agents) &&
    payload.agents.every((a) => typeof a === "string")
  ) {
    userSettingsPatch.agents = payload.agents as string[];
  }
  if (
    Array.isArray(payload.templates) &&
    payload.templates.every((t) => typeof t === "string")
  ) {
    userSettingsPatch.templates = payload.templates as string[];
  }
  if (Object.keys(userSettingsPatch).length > 0) {
    await saveUserSettings(auth.userId, userSettingsPatch);
  }

  const record = await getCredentials(auth.userId);
  const pageId = typeof payload.pageId === "string" ? payload.pageId : record?.pageId;
  const botId = telegramBotId(secrets.telegramBotToken);

  await saveCredentials({
    userId: auth.userId,
    encrypted: encryptSecrets(secrets),
    accounts: record?.accounts,
    pageName: record?.pageName,
    instagramUsername: record?.instagramUsername,
    discordBotId: record?.discordBotId,
    waPhoneNumberId: secrets.waPhoneNumberId || undefined,
    pageId: pageId || undefined,
    telegramBotId: botId ?? undefined,
    twilioPhoneNumber: secrets.twilioPhoneNumber || undefined,
    viberTokenPrefix: secrets.viberAuthToken ? secrets.viberAuthToken.slice(0, 12) : record?.viberTokenPrefix,
    emailAddress: secrets.emailFrom || record?.emailAddress,
    widgetId: record?.widgetId,
    widgetAllowedOrigins:
      Array.isArray(payload.widgetAllowedOrigins) &&
      payload.widgetAllowedOrigins.every((o) => typeof o === "string")
        ? (payload.widgetAllowedOrigins as string[])
            .map((o) => o.trim())
            .filter(Boolean)
        : record?.widgetAllowedOrigins,
    updatedAt: new Date().toISOString(),
  });

  // Auto-discover and populate connected account names & handles across all providers
  await syncProviderMetadata(auth.userId).catch((err) => {
    console.warn("[settings] Auto-sync provider metadata failed:", err);
  });

  const settings = await tenantSettings(auth.userId);
  return Response.json({
    connected: settings.connected,
    pageId: settings.pageId,
    accounts: settings.accounts,
    webhookUrl: settings.webhookUrl,
    agents: settings.agents,
    templates: settings.templates,
    aiConfigured: Boolean(settings.secrets.aiApiKey),
    aiProvider: settings.secrets.aiProvider,
    aiModel: settings.secrets.aiModel,
  });
}
