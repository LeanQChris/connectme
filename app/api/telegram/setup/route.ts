import { config } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Convenience endpoint to register or check the Telegram webhook.
 * Usage: GET /api/telegram/setup?url=https://your-domain.com/api/webhook/telegram
 */
export async function GET(request: Request): Promise<Response> {
  const token = config.telegramBotToken;
  if (!token) {
    return Response.json(
      { error: "TELEGRAM_BOT_TOKEN is not configured in .env" },
      { status: 400 },
    );
  }

  const urlParam = new URL(request.url).searchParams.get("url");

  // If no URL provided, just return current webhook info
  if (!urlParam) {
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const info = await infoRes.json();
    return Response.json({
      status: "info",
      webhook: info,
      instruction: "To register, call: /api/telegram/setup?url=https://<your-public-url>/api/webhook/telegram",
    });
  }

  // Set the webhook URL
  const webhookUrl = urlParam.endsWith("/api/webhook/telegram")
    ? urlParam
    : `${urlParam.replace(/\/$/, "")}/api/webhook/telegram`;

  const setRes = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
  );
  const data = await setRes.json();

  return Response.json({
    result: data,
    webhookUrl,
  });
}
