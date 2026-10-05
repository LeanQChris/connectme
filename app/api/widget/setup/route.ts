import { ensureWidgetId, requireUserId, settingsPayload } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * Issues (or rotates) this tenant's widget embed id. Authenticated: the id ends
 * up in a script tag on the customer's site, so it is minted here rather than
 * accepted from the client.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  let rotate = false;
  try {
    const body = (await request.json()) as { rotate?: unknown };
    rotate = body.rotate === true;
  } catch {
    // No body is fine: a plain POST just ensures the id exists.
  }

  const widgetId = await ensureWidgetId(auth.userId, rotate);
  const payload = await settingsPayload(auth.userId, new URL(request.url).origin);

  return Response.json({ widgetId, settings: payload.settings });
}