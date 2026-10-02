import { handleInstagram, handleMessenger, handleWhatsApp } from "@/lib/meta/handlers";
import type {
  InstagramWebhookBody,
  PageWebhookBody,
  WhatsAppWebhookBody,
} from "@/lib/meta/types";
import { authenticateMetaWebhook, findTenantByVerifyToken, tenantSecrets } from "@/lib/tenant";
import type { TenantContext } from "@/lib/meta/handlers";

export const runtime = "nodejs";

// Meta must be able to reach this route without a session; the POST body is
// authenticated by signature verification instead.

/** Meta's webhook verification handshake. The verify token belongs to a tenant. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token) {
    const tenant = await findTenantByVerifyToken(token);
    if (tenant) {
      return new Response(challenge ?? "", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  console.warn("[webhook] verification failed: no tenant matches hub.verify_token");
  return new Response("Forbidden", { status: 403 });
}

/** Ids inside the payload that identify which tenant sent it. */
function routingIds(body: Record<string, unknown>): { waPhoneNumberId?: string; pageId?: string } {
  const isWhatsApp = body.object === "whatsapp_business_account";
  const entries = (body.entry as Array<{ id?: string; changes?: Array<{ value?: { metadata?: { phone_number_id?: string } } }> }> | undefined) ?? [];
  
  const waPhoneNumberId = entries
    .flatMap((entry) => entry.changes ?? [])
    .map((change) => change.value?.metadata?.phone_number_id)
    .find((id): id is string => typeof id === "string");

  // Only assign pageId for Page or Instagram webhooks, never for WhatsApp Business Accounts
  const pageId = !isWhatsApp && typeof entries[0]?.id === "string" ? entries[0].id : undefined;

  return { waPhoneNumberId, pageId };
}

export async function POST(request: Request): Promise<Response> {
  // The raw body is needed verbatim for the HMAC, so read it before parsing.
  const rawBody = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  const parsed = safeJsonParse(rawBody);
  if (!parsed) {
    return new Response("Invalid payload", { status: 400 });
  }

  const ids = routingIds(parsed);
  const record = await authenticateMetaWebhook(rawBody, signature, ids);
  if (!record) {
    console.warn("[webhook] rejected request: signature did not match any tenant");
    return new Response("Invalid signature", { status: 401 });
  }

  const secrets = await tenantSecrets(record.userId);
  const tenant: TenantContext = {
    userId: record.userId,
    pageAccessToken: secrets.pageAccessToken,
    graphVersion: secrets.graphVersion,
    waAccessToken: secrets.waAccessToken,
  };

  // From here on the request is authentic, so always answer 200 and report
  // failures in the logs. A non-200 would make Meta retry the whole batch.
  try {
    switch (parsed.object) {
      case "whatsapp_business_account":
        await handleWhatsApp(tenant, parsed as WhatsAppWebhookBody);
        break;
      case "page":
        await handleMessenger(tenant, parsed as PageWebhookBody);
        break;
      case "instagram":
        await handleInstagram(tenant, parsed as InstagramWebhookBody);
        break;
      default:
        console.warn(`[webhook] unhandled object type: ${String(parsed.object)}`);
    }
  } catch (error) {
    console.error("[webhook] failed to process payload:", error);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function safeJsonParse(raw: string): (Record<string, unknown> & { object?: string }) | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown> & { object?: string };
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}
