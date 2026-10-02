import { tenantByTelegramBotId, tenantSecrets } from "@/lib/tenant";
import { handleTelegramUpdate } from "@/lib/telegram/handlers";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const runtime = "nodejs";

/**
 * Telegram posts every update to the URL registered with setWebhook, and that URL
 * carries the bot id, so the tenant is resolved from the path rather than from a
 * shared secret. An unknown bot id is answered with 404 so Telegram stops retrying.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ botId: string }> },
): Promise<Response> {
  const { botId } = await context.params;

  const tenant = await tenantByTelegramBotId(botId);
  if (!tenant) {
    return new Response(JSON.stringify({ ok: false, error: "Unknown bot" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const raw = await request.text();
    if (!raw) {
      return new Response(JSON.stringify({ ok: false, error: "Empty body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const update = JSON.parse(raw) as TelegramUpdate;
    if (update.update_id !== undefined) {
      const secrets = await tenantSecrets(tenant.userId);
      await handleTelegramUpdate(secrets.telegramBotToken, tenant.userId, update);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("[telegram webhook] failed to process update:", error);
    // 200 so Telegram does not aggressively retry malformed updates.
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function GET(): Promise<Response> {
  return new Response("Telegram Webhook Active", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
