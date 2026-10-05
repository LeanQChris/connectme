import { recordInbound } from "../store";
import type { MediaKind, MessageMedia, MessageType } from "../types";
import { fetchTelegramUserProfile, getTelegramFileUrl } from "./client";
import type { TelegramUpdate } from "./types";

export async function handleTelegramUpdate(
  token: string,
  userId: string,
  update: TelegramUpdate,
): Promise<void> {
  const message = update.message || update.edited_message;
  if (!message || !message.chat) return;

  const chatId = String(message.chat.id);
  const messageId = String(message.message_id);
  const from = message.from;

  let senderName: string = "Telegram User";
  let senderAvatarUrl: string | null = null;

  if (from) {
    try {
      const profile = await fetchTelegramUserProfile(
        token,
        String(from.id),
        from.first_name,
        from.last_name,
        from.username,
      );
      senderName = profile.name;
      senderAvatarUrl = profile.avatarUrl;
    } catch (err) {
      console.warn("[telegram] profile fetch error:", err);
      senderName = [from.first_name, from.last_name].filter(Boolean).join(" ").trim() || (from.username ? `@${from.username}` : `User ${from.id}`);
    }
  } else if (message.sender_chat) {
    senderName = message.sender_chat.first_name || message.sender_chat.username || "Telegram Chat";
  }

  let text: string | null = message.text || message.caption || null;
  let type: MessageType = "text";
  const media: MessageMedia[] = [];

  const push = async (fileId: string, kind: MediaKind, name: string | null) => {
    const url = await getTelegramFileUrl(token, fileId);
    if (!url) return;
    media.push({ url, type: kind, mimeType: mimeForKind(kind), name, size: null });
  };

  if (message.photo?.length) {
    type = "image";
    const largest = message.photo[message.photo.length - 1];
    await push(largest.file_id, "image", null);
  } else if (message.animation) {
    type = "video";
    await push(message.animation.file_id, "video", null);
  } else if (message.sticker) {
    // Stickers stay stickers so the UI can render them at their own size.
    type = "sticker";
    await push(message.sticker.file_id, "sticker", null);
    if (!text) text = message.sticker.emoji ? `Sticker ${message.sticker.emoji}` : "🎨 Sticker";
  } else if (message.video_note) {
    type = "video";
    await push(message.video_note.file_id, "video", null);
    if (!text) text = "📹 Video note";
  } else if (message.voice) {
    type = "audio";
    await push(message.voice.file_id, "audio", null);
    if (!text) text = "🎤 Voice message";
  } else if (message.audio) {
    type = "audio";
    await push(
      message.audio.file_id,
      "audio",
      message.audio.file_name ?? message.audio.title ?? null,
    );
    if (!text) text = message.caption ?? null;
  } else if (message.video) {
    type = "video";
    await push(message.video.file_id, "video", message.video.file_name ?? null);
  } else if (message.document) {
    type = "document";
    await push(message.document.file_id, "document", message.document.file_name ?? null);
    if (!text) text = message.document.file_name ?? message.caption ?? null;
  } else if (message.location) {
    type = "location";
    text = `📍 https://maps.google.com/?q=${message.location.latitude},${message.location.longitude}`;
  } else if (message.contact) {
    type = "text";
    const contactName = [message.contact.first_name, message.contact.last_name]
      .filter(Boolean)
      .join(" ");
    text = `👤 Contact: ${contactName} (${message.contact.phone_number})`;
  } else if (message.poll) {
    type = "text";
    text = `📊 Poll: ${message.poll.question}`;
  } else if (message.dice) {
    type = "text";
    text = `${message.dice.emoji} (${message.dice.value})`;
  } else if (!message.text) {
    type = "other";
  }

  try {
    const inserted = await recordInbound({
      userId,
      channel: "telegram",
      externalId: messageId,
      senderExternalId: chatId,
      senderName,
      senderAvatarUrl,
      text,
      media,
      type,
      createdAt: new Date(message.date * 1000),
    });

    if (inserted) {
      console.log(`[webhook] telegram inbound ${messageId} (${type}) from ${senderName} (chat ${chatId})`);
    } else {
      console.log(`[webhook] telegram duplicate ${messageId}, ignored`);
    }
  } catch (error) {
    console.error("[webhook] failed to store telegram message:", error);
  }
}

function mimeForKind(kind: MediaKind): string {
  switch (kind) {
    case "image":
      return "image/jpeg";
    case "sticker":
      return "image/webp";
    case "video":
      return "video/mp4";
    case "audio":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}
