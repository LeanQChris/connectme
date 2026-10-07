import { tenantByTwilioPhoneNumber } from "@/lib/tenant";
import { handleSmsWebhook } from "@/lib/sms/handlers";

export const runtime = "nodejs";

/** Twilio posts inbound SMS/MMS here; the path carries the tenant's phone number. */
export async function POST(
  request: Request,
  context: { params: Promise<{ phone: string }> },
): Promise<Response> {
  const { phone } = await context.params;
  const tenant = await tenantByTwilioPhoneNumber(decodeURIComponent(phone));
  if (!tenant) {
    return new Response(JSON.stringify({ ok: false, error: "Unknown number" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    await handleSmsWebhook(tenant.userId, params);

    // Twilio expects TwiML back; empty response just acknowledges.
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
      status: 200,
      headers: { "content-type": "text/xml" },
    });
  } catch (error) {
    console.error("[sms webhook] failed:", error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
      status: 200,
      headers: { "content-type": "text/xml" },
    });
  }
}
