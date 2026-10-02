import { telegramBotId } from "@/lib/secrets";
import { requireUserId, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * Registers (or inspects) this tenant's Telegram webhook.
 *
 * The bot id is part of the URL so the webhook route can resolve the tenant
 * without any shared secret. Usage:
 *   GET /api/telegram/setup                       -> current webhook info
 *   GET /api/telegram/setup?url=https://<domain>  -> register it
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const secrets = await tenantSecrets(auth.userId);
  const token = secrets.telegramBotToken;
  if (!token) {
    return Response.json(
      { error: "Add your Telegram bot token in Settings first." },
      { status: 400 },
    );
  }

  const botId = telegramBotId(token);
  if (!botId) {
    return Response.json({ error: "That bot token does not look valid." }, { status: 400 });
  }

  const base = new URL(request.url).searchParams.get("url");

  if (!base) {
    const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).catch(() => null);
    return Response.json({
      status: "info",
      botId,
      webhook: info ? await info.json().catch(() => null) : null,
      expectedUrl: `${new URL(request.url).origin}/api/webhook/telegram/${botId}`,
    });
  }

  const origin = base.replace(/\/$/, "");
  const webhookUrl = `${origin}/api/webhook/telegram/${botId}`;

  const setRes = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
  );
  const data = await setRes.json().catch(() => ({}));

  return Response.json({ result: data, webhookUrl });
}
