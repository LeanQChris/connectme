import { ChannelNotConfiguredError, getChannel, MetaSendError } from "@/lib/channels";
import { getConversation, recordOutbound } from "@/lib/store";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 4096;

const WINDOW_CLOSED_MESSAGE =
  "The 24-hour reply window is closed. WhatsApp only allows free-form replies inside it; " +
  "outside it an approved template message is required.";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireSession();
  if (guard) return guard;

  const { id } = await context.params;

  let payload: { text?: unknown };
  try {
    payload = (await request.json()) as { text?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) return Response.json({ error: "Message text is required" }, { status: 400 });
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: `Message is too long (maximum ${MAX_TEXT_LENGTH} characters)` },
      { status: 400 },
    );
  }

  const detail = await getConversation(id);
  if (!detail) return Response.json({ error: "Conversation not found" }, { status: 404 });

  const { conversation } = detail;
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

  const outbound = {
    channel: conversation.channel,
    contactExternalId: conversation.contactExternalId,
    text,
    type: "text" as const,
    createdAt: new Date(),
  };

  try {
    const result = await adapter.sendText({
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