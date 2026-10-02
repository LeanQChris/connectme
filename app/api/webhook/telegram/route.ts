import { handleTelegramUpdate } from "@/lib/telegram/handlers";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
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
      await handleTelegramUpdate(update);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("[telegram webhook] failed to process update:", error);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 200, // Return 200 so Telegram does not aggressively retry malformed updates
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
