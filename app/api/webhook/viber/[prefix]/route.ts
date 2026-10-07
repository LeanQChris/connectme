import { tenantByViberTokenPrefix } from "@/lib/tenant";
import { handleViberEvent } from "@/lib/viber/handlers";

export const runtime = "nodejs";

/** Viber posts events here; the path carries the tenant's token prefix. */
export async function POST(
  request: Request,
  context: { params: Promise<{ prefix: string }> },
): Promise<Response> {
  const { prefix } = await context.params;
  const tenant = await tenantByViberTokenPrefix(prefix);
  if (!tenant) {
    return new Response(JSON.stringify({ ok: false, error: "Unknown bot" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as Parameters<typeof handleViberEvent>[1];
    // Viber retries on non-200; always acknowledge after parsing.
    if (body.event === "webhook") {
      return Response.json({ status: 0 });
    }
    await handleViberEvent(tenant.userId, body);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("[viber webhook] failed:", error);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
