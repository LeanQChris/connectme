import { randomUUID } from "node:crypto";

import { recordInbound } from "@/lib/store";
import { preflight, widgetResponse } from "@/lib/widget/cors";
import { allowWidgetMessage, bearerToken, verifyWidgetSession } from "@/lib/widget/session";

export const runtime = "nodejs";

/** Visitor text is untrusted and lands in a tenant's inbox; keep it small. */
const MAX_CHARS = 4000;
/** A human types far slower than this; anything faster is a bot. */
const MAX_PER_MINUTE = 12;

export function OPTIONS(): Response {
  return preflight();
}

export async function POST(request: Request): Promise<Response> {
  const session = verifyWidgetSession(bearerToken(request));
  if (!session) return widgetResponse({ error: "Invalid session" }, 401);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (
    !allowWidgetMessage(session.sid, MAX_PER_MINUTE, 60_000) ||
    !allowWidgetMessage(`ip:${ip}`, 60, 60_000)
  ) {
    return widgetResponse({ error: "Slow down" }, 429);
  }

  let payload: { text?: unknown; name?: unknown };
  try {
    payload = (await request.json()) as { text?: unknown; name?: unknown };
  } catch {
    return widgetResponse({ error: "Invalid JSON body" }, 400);
  }

  if (typeof payload.text !== "string" || !payload.text.trim()) {
    return widgetResponse({ error: "Message cannot be empty" }, 400);
  }

  const text = payload.text.slice(0, MAX_CHARS);
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : null;

  // recordInbound creates the contact and conversation on first contact, so the
  // session needs no state of its own before this point.
  const stored = await recordInbound({
    userId: session.userId,
    channel: "widget",
    accountId: null,
    accountName: "Website",
    externalId: randomUUID(),
    senderExternalId: session.sid,
    senderName: name || "Website visitor",
    text,
    type: "text",
    createdAt: new Date(),
  });

  return widgetResponse({ ok: true, duplicate: !stored });
}