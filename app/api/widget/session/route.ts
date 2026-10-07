import { tenantByWidgetId } from "@/lib/tenant";
import { preflight, widgetResponse } from "@/lib/widget/cors";
import { originAllowed } from "@/lib/widget/origin";
import { signWidgetSession } from "@/lib/widget/session";

export const runtime = "nodejs";

/** The widget script calls this on load: it proves the embed id is live and gets a session token. */
export function OPTIONS(): Response {
  return preflight();
}

export async function POST(request: Request): Promise<Response> {
  let widgetId: unknown;
  let sid: unknown;
  try {
    const body = (await request.json()) as { widgetId?: unknown; sid?: unknown };
    widgetId = body.widgetId;
    sid = body.sid;
  } catch {
    return widgetResponse({ error: "Invalid JSON body" }, 400);
  }

  if (typeof widgetId !== "string" || !widgetId) {
    return widgetResponse({ error: "widgetId is required" }, 400);
  }

  // Unknown ids answer 404: nothing to serve, and no signal that a tenant exists.
  const tenant = await tenantByWidgetId(widgetId);
  if (!tenant) return widgetResponse({ error: "Unknown widget" }, 404);

  if (!originAllowed(request.headers.get("origin"), tenant.widgetAllowedOrigins)) {
    return widgetResponse({ error: "Origin not allowed" }, 403);
  }

  // The browser supplies the session id, so a returning visitor keeps the same
  // conversation and its pending replies.
  const sessionId =
    typeof sid === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(sid) ? sid : crypto.randomUUID();

  return widgetResponse({ token: signWidgetSession({ userId: tenant.userId, sid: sessionId }) });
}