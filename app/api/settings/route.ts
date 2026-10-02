import { encryptSecrets, telegramBotId } from "@/lib/secrets";
import { getCredentials, saveCredentials } from "@/lib/store";
import { requireUserId, tenantSecrets, tenantSettings } from "@/lib/tenant";

export const runtime = "nodejs";

const KEYS = [
  "waPhoneNumberId",
  "waAccessToken",
  "waAppId",
  "metaAppSecret",
  "webhookVerifyToken",
  "pageAccessToken",
  "telegramBotToken",
  "graphVersion",
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

  const [settings, secrets] = await Promise.all([
    tenantSettings(auth.userId),
    tenantSecrets(auth.userId),
  ]);
  const origin = new URL(request.url).origin;
  const botId = telegramBotId(secrets.telegramBotToken);

  return Response.json({
    settings: {
      connected: settings.connected,
      pageId: settings.pageId,
      telegramBotId: settings.telegramBotId,
      updatedAt: settings.updatedAt,
      // Present so the user can copy it into the Meta webhook form.
      webhookVerifyToken: secrets.webhookVerifyToken,
    },
    webhookUrls: {
      meta: `${origin}/api/webhook`,
      telegram: botId ? `${origin}/api/webhook/telegram/${botId}` : null,
    },
  });
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

  const record = await getCredentials(auth.userId);
  const pageId = typeof payload.pageId === "string" ? payload.pageId : record?.pageId;
  const botId = telegramBotId(secrets.telegramBotToken);

  await saveCredentials({
    userId: auth.userId,
    encrypted: encryptSecrets(secrets),
    waPhoneNumberId: secrets.waPhoneNumberId || undefined,
    pageId: pageId || undefined,
    telegramBotId: botId ?? undefined,
    updatedAt: new Date().toISOString(),
  });

  const settings = await tenantSettings(auth.userId);
  return Response.json({ connected: settings.connected, pageId: settings.pageId });
}
