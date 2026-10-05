import type { Tenant } from "@/lib/channels";
import {
  canSendMedia,
  ChannelNotConfiguredError,
  getChannel,
  MetaSendError,
  supportedMediaKinds,
} from "@/lib/channels";
import { getConversation, recordOutbound } from "@/lib/store";
import { requireUserId, tenantSecrets } from "@/lib/tenant";
import { isMediaKind, MAX_UPLOAD_BYTES, type MessageMedia, type MessageType } from "@/lib/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 4096;
/** Ten is the lowest per-platform cap we support (Telegram album, Discord files). */
const MAX_MEDIA_PER_MESSAGE = 10;

const WINDOW_CLOSED_MESSAGE =
  "The 24-hour reply window is closed. WhatsApp only allows free-form replies inside it; " +
  "outside it an approved template message is required.";

interface ParsedMedia {
  media: MessageMedia[];
  rejected: string[];
}

/** Keeps only attachments this channel can actually deliver, reporting the rest. */
function parseMedia(raw: unknown, channel: string, origin: string): ParsedMedia {
  if (!Array.isArray(raw)) return { media: [], rejected: [] };
  if (raw.length > MAX_MEDIA_PER_MESSAGE) {
    throw new Error(`At most ${MAX_MEDIA_PER_MESSAGE} attachments per message`);
  }

  const media: MessageMedia[] = [];
  const rejected: string[] = [];

  for (const entry of raw) {
    const item = entry as Partial<MessageMedia>;
    if (!item || typeof item.url !== "string" || !item.url.trim()) continue;

    if (!isMediaKind(item.type)) {
      rejected.push(String(item.name ?? item.url));
      continue;
    }
    if (!canSendMedia(channel as Parameters<typeof canSendMedia>[0], item.type)) {
      rejected.push(String(item.name ?? item.url));
      continue;
    }
    if (item.size !== null && item.size !== undefined && item.size > MAX_UPLOAD_BYTES) {
      throw new Error("Attachment is larger than the upload limit");
    }

    media.push({
      url: new URL(item.url, origin).toString(),
      type: item.type,
      mimeType: typeof item.mimeType === "string" && item.mimeType ? item.mimeType : "application/octet-stream",
      name: typeof item.name === "string" && item.name ? item.name.slice(0, 200) : null,
      size: typeof item.size === "number" ? item.size : null,
    });
  }

  return { media, rejected };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;

  let payload: { text?: unknown; media?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  const baseSecrets = await tenantSecrets(auth.userId);
  const { getAccountAccessToken } = await import("@/lib/tenant");
  const detail = await getConversation(auth.userId, id, {
    pageAccessToken: baseSecrets.pageAccessToken,
    graphVersion: baseSecrets.graphVersion,
  });
  if (!detail) return Response.json({ error: "Conversation not found" }, { status: 404 });

  const { conversation } = detail;
  const accountToken = await getAccountAccessToken(auth.userId, conversation.accountId);
  const tenant: Tenant = {
    ...baseSecrets,
    userId: auth.userId,
    pageAccessToken: accountToken || baseSecrets.pageAccessToken,
  };

  if (!conversation.window.open) {
    return Response.json({ error: WINDOW_CLOSED_MESSAGE }, { status: 409 });
  }

  const adapter = getChannel(conversation.channel);
  if (!adapter) {
    return Response.json(
      { error: `No channel adapter registered for ${conversation.channel}` },
      { status: 400 },
    );
  }

  // Channels fetch attachments themselves, so hand them absolute URLs.
  let media: MessageMedia[] = [];
  let rejected: string[] = [];
  try {
    ({ media, rejected } = parseMedia(payload.media, conversation.channel, request.url));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid attachment" },
      { status: 400 },
    );
  }

  if (!text && media.length === 0) {
    return Response.json({ error: "Message text or an attachment is required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `Message is too long (maximum ${MAX_TEXT_LENGTH} characters)` },
      { status: 400 },
    );
  }
  if (media.length > 0 && !adapter.sendMedia) {
    return Response.json(
      { error: `${conversation.channel} does not support attachments` },
      { status: 400 },
    );
  }

  // A message is typed by its content: an attachment decides the type, else text.
  const primary = media.find((m) => m.type !== "sticker") ?? media[0];
  const type: MessageType = media.length > 0 ? (primary?.type ?? "text") : "text";

  const outbound = {
    userId: auth.userId,
    channel: conversation.channel,
    contactExternalId: conversation.contactExternalId,
    text,
    media,
    type,
    createdAt: new Date(),
  };

  try {
    const results = media.length
      ? await adapter.sendMedia!({
          tenant,
          contact: { channel: conversation.channel, externalId: conversation.contactExternalId },
          text,
          media,
        })
      : [
          await adapter.sendText({
            tenant,
            contact: { channel: conversation.channel, externalId: conversation.contactExternalId },
            text,
          }),
        ];

    const externalIds = results.map((r) => r.externalId).filter((id): id is string => Boolean(id));
    const message = await recordOutbound({
      ...outbound,
      externalId: externalIds[0] ?? null,
      externalIds,
      status: "sent",
    });

    return Response.json(
      {
        message,
        skipped: rejected,
        supportedTypes: supportedMediaKinds(conversation.channel),
      },
      { status: 201 },
    );
  } catch (error) {
    const reason =
      error instanceof MetaSendError || error instanceof Error
        ? error.message
        : "Unknown error while sending";

    // Keep a record even on failure so the thread shows what happened.
    const message = await recordOutbound({
      ...outbound,
      externalId: null,
      externalIds: [],
      status: "failed",
      error: reason,
    });

    if (error instanceof ChannelNotConfiguredError) {
      console.warn(`[reply] ${conversation.channel} is not configured: ${reason}`);
      return Response.json({ error: reason, message }, { status: 503 });
    }

    console.error(`[reply] ${conversation.channel} send failed:`, reason);
    return Response.json({ error: reason, message }, { status: 502 });
  }
}