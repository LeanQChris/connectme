import type { Tenant } from "@/lib/channels";
import { ChannelNotConfiguredError, getChannel, MetaSendError } from "@/lib/channels";
import { getConversation, recordOutbound } from "@/lib/store";
import { requireUserId, tenantSecrets } from "@/lib/tenant";
import type { MessageType } from "@/lib/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 4096;

const ATTACHMENT_TYPES = ["image", "audio", "video", "document"] as const;
type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

const WINDOW_CLOSED_MESSAGE =
  "The 24-hour reply window is closed. WhatsApp only allows free-form replies inside it; " +
  "outside it an approved template message is required.";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;

  let payload: { text?: unknown; mediaUrl?: unknown; mimeType?: unknown; type?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const mediaPath = typeof payload.mediaUrl === "string" ? payload.mediaUrl.trim() : "";
  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "application/octet-stream";
  const declaredType = ATTACHMENT_TYPES.includes(payload.type as AttachmentType)
    ? (payload.type as AttachmentType)
    : null;

  if (!text && !mediaPath) {
    return Response.json({ error: "Message text or an attachment is required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `Message is too long (maximum ${MAX_TEXT_LENGTH} characters)` },
      { status: 400 },
    );
  }

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

  // Channels fetch media themselves, so hand them an absolute URL.
  const mediaUrl = mediaPath ? new URL(mediaPath, request.url).toString() : null;
  const sendMedia = Boolean(mediaUrl);

  if (sendMedia && !adapter.sendMedia) {
    return Response.json(
      { error: `${conversation.channel} does not support attachments` },
      { status: 400 },
    );
  }

  const outbound = {
    userId: auth.userId,
    channel: conversation.channel,
    contactExternalId: conversation.contactExternalId,
    text,
    mediaUrl,
    type: (declaredType ?? "text") as MessageType,
    createdAt: new Date(),
  };

  try {
    const result = sendMedia
      ? await adapter.sendMedia!({
          tenant,
          contact: { channel: conversation.channel, externalId: conversation.contactExternalId },
          text,
          mediaUrl: mediaUrl!,
          mimeType,
          type: (declaredType ?? "document") as AttachmentType,
        })
      : await adapter.sendText({
          tenant,
          contact: { channel: conversation.channel, externalId: conversation.contactExternalId },
          text,
        });
    const message = await recordOutbound({
      ...outbound,
      externalId: result.externalId,
      status: "sent",
    });
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    const reason =
      error instanceof MetaSendError || error instanceof Error
        ? error.message
        : "Unknown error while sending";

    // Keep a record even on failure so the thread shows what happened.
    const message = await recordOutbound({
      ...outbound,
      externalId: null,
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