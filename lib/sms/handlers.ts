import { recordInbound } from "../store";
import type { MessageMedia } from "../types";

/**
 * Twilio posts inbound messages as form fields: From, To, Body, MessageSid,
 * and MediaUrl0..N with parallel MediaContentType0..N.
 */
export async function handleSmsWebhook(
  userId: string,
  params: URLSearchParams,
): Promise<void> {
  const from = params.get("From");
  const messageSid = params.get("MessageSid");
  if (!from || !messageSid) return;

  const media: MessageMedia[] = [];
  for (let i = 0; params.has(`MediaUrl${i}`); i += 1) {
    const url = params.get(`MediaUrl${i}`)!;
    const mime = params.get(`MediaContentType${i}`) ?? "";
    media.push({
      url,
      type: mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "document",
      mimeType: mime || "application/octet-stream",
      name: null,
      size: null,
    });
  }

  await recordInbound({
    userId,
    channel: "sms",
    externalId: messageSid,
    senderExternalId: from,
    senderName: from,
    senderAvatarUrl: null,
    text: params.get("Body") || null,
    media,
    type: media.length > 0 ? media[0].type : "text",
    createdAt: new Date(),
  });
}
