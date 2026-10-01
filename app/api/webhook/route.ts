import { config } from "@/lib/config";
import { handleInstagram, handleMessenger, handleWhatsApp } from "@/lib/meta/handlers";
import type {
  InstagramWebhookBody,
  PageWebhookBody,
  WhatsAppWebhookBody,
} from "@/lib/meta/types";
import { safeEqual, verifyWebhookSignature } from "@/lib/meta/verify";

export const runtime = "nodejs";

// Meta must be able to reach this route without a session; the POST body is
// authenticated by signature verification instead.

/** Meta's webhook verification handshake. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token && safeEqual(token, config.webhookVerifyToken)) {
    return new Response(challenge ?? "", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  console.warn("[webhook] verification failed: mode or verify_token mismatch");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request): Promise<Response> {
  // The raw body is needed verbatim for the HMAC, so read it before parsing.
  const rawBody = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, config.appSecret)) {
    console.warn("[webhook] rejected request with invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  // From here on the request is authentic, so always answer 200 and report
  // failures in the logs. A non-200 would make Meta retry the whole batch.
  try {
    const body = JSON.parse(rawBody) as { object?: string };

    switch (body?.object) {
      case "whatsapp_business_account":
        await handleWhatsApp(body as WhatsAppWebhookBody);
        break;
      case "page":
        await handleMessenger(body as PageWebhookBody);
        break;
      case "instagram":
        await handleInstagram(body as InstagramWebhookBody);
        break;
      default:
        console.warn(`[webhook] unhandled object type: ${String(body?.object)}`);
    }
  } catch (error) {
    console.error("[webhook] failed to process payload:", error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}