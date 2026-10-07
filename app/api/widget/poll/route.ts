import { takeWidgetMessages } from "@/lib/store";
import { preflight, widgetResponse } from "@/lib/widget/cors";
import { requestOriginAllowed } from "@/lib/widget/origin";
import { bearerToken, verifyWidgetSession } from "@/lib/widget/session";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return preflight();
}

/**
 * The visitor's browser calls this every few seconds while the panel is open and
 * picks up whatever the agent has replied. A closed tab simply collects the
 * replies when it comes back, which is why the widget has no delivery receipts.
 */
export async function GET(request: Request): Promise<Response> {
  const session = verifyWidgetSession(bearerToken(request));
  if (!session) return widgetResponse({ error: "Invalid session" }, 401);
  if (!(await requestOriginAllowed(session.userId, request))) {
    return widgetResponse({ error: "Origin not allowed" }, 403);
  }

  const messages = await takeWidgetMessages(session.userId, session.sid);
  return widgetResponse({ messages });
}