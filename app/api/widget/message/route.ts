import { randomUUID } from "node:crypto";

import { recordInbound } from "@/lib/store";
import { isMediaKind, type MessageMedia, type MessageType } from "@/lib/types";
import { preflight, widgetResponse } from "@/lib/widget/cors";
import { requestOriginAllowed } from "@/lib/widget/origin";
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
  if (!(await requestOriginAllowed(session.userId, request))) {
    return widgetResponse({ error: "Origin not allowed" }, 403);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (
    !allowWidgetMessage(session.sid, MAX_PER_MINUTE, 60_000) ||
    !allowWidgetMessage(`ip:${ip}`, 60, 60_000)
  ) {
    return widgetResponse({ error: "Slow down" }, 429);
  }

  let payload: { text?: unknown; name?: unknown; media?: unknown };
  try {
    payload = (await request.json()) as { text?: unknown; name?: unknown; media?: unknown };
  } catch {
    return widgetResponse({ error: "Invalid JSON body" }, 400);
  }

  const hasText = typeof payload.text === "string" && payload.text.trim();

  // Attachments are only trusted when they came back through our own upload route.
  const media: MessageMedia[] = [];
  if (Array.isArray(payload.media)) {
    if (payload.media.length > 10) {
      return widgetResponse({ error: "At most 10 attachments" }, 400);
    }
    for (const entry of payload.media) {
      const item = entry as Partial<MessageMedia>;
      if (
        !item ||
        typeof item.url !== "string" ||
        !item.url.startsWith("/api/media?file=") ||
        !isMediaKind(item.type)
      ) {
        return widgetResponse({ error: "Invalid attachment" }, 400);
      }
      media.push({
        url: item.url,
        type: item.type,
        mimeType: typeof item.mimeType === "string" ? item.mimeType : "application/octet-stream",
        name: typeof item.name === "string" ? item.name.slice(0, 200) : null,
        size: typeof item.size === "number" ? item.size : null,
      });
    }
  }

  if (!hasText && media.length === 0) {
    return widgetResponse({ error: "Message cannot be empty" }, 400);
  }

  const text = hasText ? (payload.text as string).slice(0, MAX_CHARS) : "";
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : null;
  const type: MessageType = media.length > 0 ? (media[0]?.type ?? "text") : "text";

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
    text: text || null,
    media,
    type,
    createdAt: new Date(),
  });

  return widgetResponse({ ok: true, duplicate: !stored });
}