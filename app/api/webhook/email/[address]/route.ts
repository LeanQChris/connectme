import { tenantByEmailAddress } from "@/lib/tenant";
import { handleEmailWebhook } from "@/lib/email/handlers";

export const runtime = "nodejs";

/** Inbound email lands here; the path carries the tenant's sender address. */
export async function POST(
  request: Request,
  context: { params: Promise<{ address: string }> },
): Promise<Response> {
  const { address } = await context.params;
  const tenant = await tenantByEmailAddress(decodeURIComponent(address));
  if (!tenant) {
    return new Response(JSON.stringify({ ok: false, error: "Unknown address" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as Parameters<typeof handleEmailWebhook>[1];
    await handleEmailWebhook(tenant.userId, body);
    return Response.json({ received: true });
  } catch (error) {
    console.error("[email webhook] failed:", error);
    return Response.json({ received: true });
  }
}
