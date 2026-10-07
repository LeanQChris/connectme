import { recordInbound } from "../store";
import type { MessageMedia, MessageType } from "../types";

/** Viber posts webhook events; we care about `message` ones. */
export async function handleViberEvent(
  userId: string,
  body: {
    event?: string;
    message_token?: number;
    message?: {
      type?: string;
      text?: string;
      media?: string;
      file_name?: string;
      file_size?: number;
    };
    sender?: { id?: string; name?: string; avatar?: string };
    timestamp?: number;
  },
): Promise<void> {
  if (body.event !== "message" || !body.message || !body.sender?.id) return;

  const msg = body.message;
  let type: MessageType = "text";
  const media: MessageMedia[] = [];

  if (msg.type === "picture" || msg.type === "video" || msg.type === "file") {
    type = msg.type === "picture" ? "image" : msg.type === "video" ? "video" : "document";
    if (msg.media) {
      media.push({
        url: msg.media,
        type,
        mimeType: msg.type === "picture" ? "image/jpeg" : msg.type === "video" ? "video/mp4" : "application/octet-stream",
        name: msg.file_name ?? null,
        size: msg.file_size ?? null,
      });
    }
  }

  await recordInbound({
    userId,
    channel: "viber",
    externalId: String(body.message_token ?? `${body.timestamp ?? Date.now()}`),
    senderExternalId: body.sender.id,
    senderName: body.sender.name ?? "Viber User",
    senderAvatarUrl: body.sender.avatar ?? null,
    text: msg.text || null,
    media,
    type,
    createdAt: body.timestamp ? new Date(body.timestamp) : new Date(),
  });
}
