import { recordInbound } from "../store";
import type { MessageType } from "../types";
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
  let mediaUrl: string | null = null;

  if (message.photo && message.photo.length > 0) {
    type = "image";
    const largestPhoto = message.photo[message.photo.length - 1];
    mediaUrl = await getTelegramFileUrl(token, largestPhoto.file_id);
    if (!text) text = message.caption || null;
  } else if (message.voice) {
    type = "audio";
    mediaUrl = await getTelegramFileUrl(token, message.voice.file_id);
  } else if (message.audio) {
    type = "audio";
    mediaUrl = await getTelegramFileUrl(token, message.audio.file_id);
  } else if (message.video) {
    type = "video";
    mediaUrl = await getTelegramFileUrl(token, message.video.file_id);
    if (!text) text = message.caption || null;
  } else if (message.document) {
    type = "document";
    mediaUrl = await getTelegramFileUrl(token, message.document.file_id);
    if (!text) text = message.document.file_name || message.caption || null;
  } else if (message.text) {
    type = "text";
  } else {
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
      mediaUrl,
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
